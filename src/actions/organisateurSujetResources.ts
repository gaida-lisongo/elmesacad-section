"use server";

import { Types } from "mongoose";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { getOrganisateurChargeRechercheSection } from "@/lib/section/getOrganisateurChargeRechercheSection";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";

export type SujetResourceRow = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  /** Slug programme section (stocké côté service comme `matiere.reference`). */
  matiereReference: string;
  /** Crédits du programme tels que renvoyés par le service (`matiere.credit`). */
  matiereCredit: number;
  lecteursLabel: string;
  brandingSectionRef: string;
};

export type LecteurAgentPayload = {
  id: string;
  nom: string;
  email: string;
  matricule: string;
};

/** Blocs `description` alignés sur le service étudiant : `title` + `contenu[]`. */
export type DescriptionSectionInput = {
  title: string;
  contenu: string[];
};

function agentRefToId(ref: unknown): string | null {
  if (ref == null) return null;
  if (typeof ref === "string" && Types.ObjectId.isValid(ref)) return ref;
  if (typeof ref === "object" && ref !== null && "_id" in ref) {
    const id = String((ref as { _id: unknown })._id);
    return Types.ObjectId.isValid(id) ? id : null;
  }
  try {
    const id = String(ref);
    return Types.ObjectId.isValid(id) ? id : null;
  } catch {
    return null;
  }
}

async function loadJuryRechercheMemberIds(sectionId: string): Promise<Set<string>> {
  if (!Types.ObjectId.isValid(sectionId)) return new Set();
  await connectDB();
  const doc = await SectionModel.findById(sectionId).select("jury.recherche").lean();
  const ids = new Set<string>();
  const jr = doc?.jury?.recherche;
  const push = (ref: unknown) => {
    const id = agentRefToId(ref);
    if (id) ids.add(id);
  };
  push(jr?.president);
  push(jr?.secretaire);
  const membres = jr?.membres;
  if (Array.isArray(membres)) {
    for (const m of membres) push(m);
  }
  return ids;
}

async function assertLecteursInJuryRecherche(sectionId: string, lecteurs: LecteurAgentPayload[]) {
  const allowed = await loadJuryRechercheMemberIds(sectionId);
  if (allowed.size === 0) {
    throw new Error("Aucun membre n'est configuré dans le jury de recherche de cette section.");
  }
  for (const l of lecteurs) {
    const id = String(l.id ?? "").trim();
    if (!id || !allowed.has(id)) {
      throw new Error("Chaque lecteur doit être choisi parmi les membres du jury de recherche de la section.");
    }
  }
}

function normalizeDescriptionSections(
  sections: DescriptionSectionInput[]
): Array<{ title: string; contenu: string[] }> {
  const out = sections
    .map((s) => ({
      title: (String(s.title ?? "").trim() || "Section").slice(0, 200),
      contenu: (Array.isArray(s.contenu) ? s.contenu : [])
        .map((c) => String(c ?? "").trim())
        .filter(Boolean),
    }))
    .filter((s) => s.contenu.length > 0);
  if (out.length === 0) return [{ title: "Description", contenu: ["—"] }];
  return out;
}

async function resolveChefNameForSection(sectionId: string): Promise<string> {
  if (!Types.ObjectId.isValid(sectionId)) return "";
  await connectDB();
  const doc = await SectionModel.findById(sectionId)
    .select("bureau.chefSection")
    .populate("bureau.chefSection", "name")
    .lean();
  const ch = doc?.bureau?.chefSection;
  if (ch && typeof ch === "object" && "name" in ch) {
    return String((ch as { name?: string }).name ?? "").trim();
  }
  return "";
}

function parseDescriptionSectionsFromApi(raw: unknown): DescriptionSectionInput[] {
  const blocks = Array.isArray(raw) ? raw : [];
  return blocks.map((block) => {
    const b = block && typeof block === "object" ? (block as Record<string, unknown>) : {};
    const contenu = Array.isArray(b.contenu)
      ? b.contenu.map((x) => String(x ?? "").trim()).filter(Boolean)
      : [];
    return {
      title: String(b.title ?? "").trim(),
      contenu,
    };
  });
}

async function resolveProgrammeForSection(
  sectionId: string,
  programmeSlug: string
): Promise<{ slug: string; designation: string; credits: number }> {
  const slug = String(programmeSlug ?? "").trim();
  if (!slug || !Types.ObjectId.isValid(sectionId)) {
    throw new Error("Programme de section requis.");
  }
  await connectDB();
  const prog = await ProgrammeModel.findOne({
    section: new Types.ObjectId(sectionId),
    slug,
  })
    .select("slug designation credits")
    .lean();
  if (!prog) {
    throw new Error("Programme inconnu ou non rattaché à votre section.");
  }
  const rawCredits = (prog as { credits?: unknown }).credits;
  const credits = typeof rawCredits === "number" && Number.isFinite(rawCredits) ? Math.max(0, rawCredits) : 0;
  return {
    slug: String((prog as { slug?: string }).slug ?? "").trim(),
    designation: String((prog as { designation?: string }).designation ?? "").trim(),
    credits,
  };
}

function lecteursToApiPayload(lecteurs: LecteurAgentPayload[]): Array<{
  nom: string;
  email: string;
  matricule: string;
  reference: string;
}> {
  const clean = lecteurs
    .map((l) => ({
      nom: String(l.nom ?? "").trim(),
      email: String(l.email ?? "").trim(),
      matricule: String(l.matricule ?? "").trim(),
      reference: String(l.id ?? "").trim(),
    }))
    .filter((l) => l.nom.length > 0);
  if (clean.length === 0) throw new Error("Au moins un lecteur (agent) est requis.");
  return clean;
}

async function assertChargeRechercheContext() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    throw new Error("Accès réservé aux organisateurs.");
  }
  const ctx = await getOrganisateurChargeRechercheSection(session.sub);
  if (!ctx || !ctx.sectionSlug) {
    throw new Error("Vous devez être désigné chargé de recherche du bureau d'une section.");
  }
  return ctx;
}

function readJsonPayload(upstream: Response, rawText: string): Record<string, unknown> {
  if (!rawText) return {};
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { message: rawText.slice(0, 400) };
  }
}

function pickErrorMessage(payload: Record<string, unknown>, fallback: string): string {
  return (
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.error === "string" && payload.error) ||
    fallback
  );
}

function rowFromApi(raw: unknown): SujetResourceRow | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = String(r._id ?? r.id ?? "").trim();
  if (!id) return null;
  const matiere = r.matiere && typeof r.matiere === "object" ? (r.matiere as Record<string, unknown>) : {};
  const lecteurs = Array.isArray(r.lecteurs) ? r.lecteurs : [];
  const lecteursLabel = lecteurs
    .map((l) => {
      const o = l && typeof l === "object" ? (l as Record<string, unknown>) : {};
      return String(o.nom ?? "").trim();
    })
    .filter(Boolean)
    .join(", ");
  const branding = r.branding && typeof r.branding === "object" ? (r.branding as Record<string, unknown>) : {};
  const creditVal = matiere.credit ?? matiere.credits;
  let matiereCredit = 0;
  if (typeof creditVal === "number" && Number.isFinite(creditVal)) matiereCredit = Math.max(0, creditVal);
  else if (creditVal != null && creditVal !== "") {
    const n = Number(creditVal);
    if (Number.isFinite(n)) matiereCredit = Math.max(0, n);
  }
  return {
    id,
    designation: String(r.designation ?? "").trim(),
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? "USD").trim() || "USD",
    status: String(r.status ?? "").trim(),
    matiereReference: String(matiere.reference ?? "").trim(),
    matiereCredit,
    lecteursLabel,
    brandingSectionRef: String(branding.sectionRef ?? "").trim(),
  };
}

export async function listOrganisateurSujetResourcesAction(input: {
  sectionSlug: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ rows: SujetResourceRow[]; total: number; page: number; limit: number }> {
  const ctx = await assertChargeRechercheContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre habilitation.");
  }
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(200, input.limit ?? 10));
  const sp = new URLSearchParams({
    categorie: "sujet",
    page: String(page),
    limit: String(limit),
  });
  sp.append("branding.sectionRef", ctx.sectionSlug);
  if (input.search?.trim()) sp.set("search", input.search.trim());

  const upstream = await fetchEtudiantApi(`/resources?${sp.toString()}`, { method: "GET" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Impossible de charger les ressources sujets."));
  }
  const data = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta && typeof payload.meta === "object" ? (payload.meta as Record<string, unknown>) : {};
  const total = typeof meta.total === "number" ? meta.total : data.length;
  const rows = data.map(rowFromApi).filter((x): x is SujetResourceRow => x != null);
  return {
    rows,
    total,
    page: typeof meta.page === "number" ? meta.page : page,
    limit: typeof meta.limit === "number" ? meta.limit : limit,
  };
}

export type SujetCommandeListRow = {
  id: string;
  orderNumber: string;
  reference: string;
  payment: string;
  type: string;
  matricule: string;
  studentEmail: string;
  designation: string;
  createdAt: string;
};

function commandeRowFromEtudiantApi(raw: unknown): SujetCommandeListRow | null {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = String(o._id ?? o.id ?? "").trim();
  if (!id) return null;
  const parcours =
    o.parcours && typeof o.parcours === "object" ? (o.parcours as Record<string, unknown>) : {};
  const student =
    parcours.student && typeof parcours.student === "object"
      ? (parcours.student as Record<string, unknown>)
      : {};
  const res =
    o.ressource && typeof o.ressource === "object" ? (o.ressource as Record<string, unknown>) : {};
  const created = o.createdAt ?? o.created_at;
  let createdAt = "";
  if (created instanceof Date) createdAt = created.toISOString();
  else if (typeof created === "string") createdAt = created;
  return {
    id,
    orderNumber: String(o.orderNumber ?? "").trim(),
    reference: String(o.reference ?? "").trim(),
    payment: String(o.payment ?? "").trim(),
    type: String(o.type ?? "").trim(),
    matricule: String(student.matricule ?? "").trim(),
    studentEmail: String(student.email ?? "").trim(),
    designation: String(res.designation ?? "").trim(),
    createdAt,
  };
}

export async function listSujetCommandesForResourceAction(input: {
  sectionSlug: string;
  resourceId: string;
  page?: number;
  limit?: number;
}): Promise<{ rows: SujetCommandeListRow[]; total: number; page: number; limit: number }> {
  const ctx = await assertChargeRechercheContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre habilitation.");
  }
  const resourceId = String(input.resourceId ?? "").trim();
  if (!resourceId) throw new Error("Identifiant ressource requis.");

  const verifyRes = await fetchEtudiantApi(`/resources/${resourceId}`, { method: "GET" });
  const verifyText = await verifyRes.text();
  const verifyPayload = readJsonPayload(verifyRes, verifyText);
  if (!verifyRes.ok) {
    throw new Error(pickErrorMessage(verifyPayload, "Ressource introuvable."));
  }
  const verifyRow = verifyPayload.data ?? verifyPayload;
  const row = rowFromApi(verifyRow);
  if (!row) throw new Error("Ressource invalide.");
  if (row.brandingSectionRef && row.brandingSectionRef !== ctx.sectionSlug) {
    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");
  }

  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(200, input.limit ?? 20));

  const criteria = JSON.stringify({ ressourceId: resourceId, type: "sujet" });
  const sp = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: "sujet",
    criteria,
  });

  /** Chemin relatif au host : `ETUDIANT_SERVICE` inclut déjà le segment `/api`. */
  const upstream = await fetchEtudiantApi(`/commandes/admin/list?${sp.toString()}`, {
    method: "GET",
  });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Impossible de charger les commandes pour cette ressource."));
  }
  const data = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta && typeof payload.meta === "object" ? (payload.meta as Record<string, unknown>) : {};
  const total = typeof meta.total === "number" ? meta.total : data.length;
  const rows = data.map(commandeRowFromEtudiantApi).filter((x): x is SujetCommandeListRow => x != null);
  return {
    rows,
    total,
    page: typeof meta.page === "number" ? meta.page : page,
    limit: typeof meta.limit === "number" ? meta.limit : limit,
  };
}

export async function getOrganisateurSujetResourceAction(input: {
  sectionSlug: string;
  id: string;
}): Promise<
  SujetResourceRow & {
    descriptionSections: DescriptionSectionInput[];
    programmeSlug: string;
    lecteursAgents: LecteurAgentPayload[];
    brandingSectionLabel: string;
    brandingChef: string;
    brandingContact: string;
    brandingEmail: string;
    brandingAdresse: string;
  }
> {
  const ctx = await assertChargeRechercheContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre habilitation.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  const upstream = await fetchEtudiantApi(`/resources/${id}`, { method: "GET" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Ressource introuvable."));
  }
  const row = payload.data ?? payload;
  const base = rowFromApi(row);
  if (!base) throw new Error("Ressource invalide.");
  if (base.brandingSectionRef && base.brandingSectionRef !== ctx.sectionSlug) {
    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");
  }
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const lecteurs = Array.isArray(r.lecteurs) ? r.lecteurs : [];
  const lecteursAgents: LecteurAgentPayload[] = lecteurs
    .map((l) => {
      const o = l && typeof l === "object" ? (l as Record<string, unknown>) : {};
      return {
        id: String(o.reference ?? "").trim(),
        nom: String(o.nom ?? "").trim(),
        email: String(o.email ?? "").trim(),
        matricule: String(o.matricule ?? "").trim(),
      };
    })
    .filter((x) => x.nom || x.email);
  const matiere = r.matiere && typeof r.matiere === "object" ? (r.matiere as Record<string, unknown>) : {};
  const branding = r.branding && typeof r.branding === "object" ? (r.branding as Record<string, unknown>) : {};
  let descriptionSections = parseDescriptionSectionsFromApi(r.description);
  if (descriptionSections.length === 0) {
    descriptionSections = [{ title: "Description", contenu: [""] }];
  }
  return {
    ...base,
    descriptionSections,
    programmeSlug: String(matiere.reference ?? "").trim(),
    lecteursAgents,
    brandingSectionLabel: String(branding.section ?? "").trim(),
    brandingChef: String(branding.chef ?? "").trim(),
    brandingContact: String(branding.contact ?? "").trim(),
    brandingEmail: String(branding.email ?? "").trim(),
    brandingAdresse: String(branding.adresse ?? "").trim(),
  };
}

export async function createOrganisateurSujetResourceAction(input: {
  sectionSlug: string;
  designation: string;
  descriptionSections: DescriptionSectionInput[];
  amount: number;
  currency: string;
  programmeSlug: string;
  lecteurs: LecteurAgentPayload[];
  brandingSectionLabel?: string;
  brandingContact: string;
  brandingEmail: string;
  brandingAdresse: string;
}): Promise<SujetResourceRow> {
  const ctx = await assertChargeRechercheContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre habilitation.");
  }

  const contact = String(input.brandingContact ?? "").trim();
  const emailBranding = String(input.brandingEmail ?? "").trim();
  const adresse = String(input.brandingAdresse ?? "").trim();
  if (!contact) throw new Error("Le contact (téléphone ou personne) du branding est requis.");
  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");
  if (!adresse) throw new Error("L’adresse du branding est requise.");

  const description = normalizeDescriptionSections(input.descriptionSections ?? []);

  const programme = await resolveProgrammeForSection(ctx.sectionId, input.programmeSlug);
  await assertLecteursInJuryRecherche(ctx.sectionId, input.lecteurs);
  const lecteurs = lecteursToApiPayload(input.lecteurs);
  const chef = await resolveChefNameForSection(ctx.sectionId);

  const body = {
    categorie: "sujet",
    designation: input.designation.trim(),
    amount: Math.max(0, Number(input.amount) || 0),
    currency: (input.currency || "USD").trim(),
    description,
    matiere: {
      reference: programme.slug,
      designation: programme.designation,
      credit: programme.credits,
    },
    lecteurs,
    branding: {
      institut: "INBTP",
      sectionRef: ctx.sectionSlug,
      section: (input.brandingSectionLabel ?? ctx.sectionDesignation).trim() || ctx.sectionSlug,
      chef,
      contact,
      email: emailBranding,
      adresse,
    },
  };

  const upstream = await fetchEtudiantApi("/resources", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Création de la ressource impossible."));
  }
  const created = payload.data ?? JSON.parse(rawText || "{}");
  const row = rowFromApi(created);
  if (!row) throw new Error("Réponse service invalide après création.");
  return row;
}

export async function updateOrganisateurSujetResourceAction(input: {
  sectionSlug: string;
  id: string;
  designation: string;
  descriptionSections: DescriptionSectionInput[];
  amount: number;
  currency: string;
  programmeSlug: string;
  lecteurs: LecteurAgentPayload[];
  brandingSectionLabel?: string;
  brandingContact: string;
  brandingEmail: string;
  brandingAdresse: string;
  status?: string;
}): Promise<SujetResourceRow> {
  const ctx = await assertChargeRechercheContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre habilitation.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getOrganisateurSujetResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const description = normalizeDescriptionSections(input.descriptionSections ?? []);

  const contact = String(input.brandingContact ?? "").trim();
  const emailBranding = String(input.brandingEmail ?? "").trim();
  const adresse = String(input.brandingAdresse ?? "").trim();
  if (!contact) throw new Error("Le contact (téléphone ou personne) du branding est requis.");
  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");
  if (!adresse) throw new Error("L’adresse du branding est requise.");

  const programme = await resolveProgrammeForSection(ctx.sectionId, input.programmeSlug);
  await assertLecteursInJuryRecherche(ctx.sectionId, input.lecteurs);
  const lecteurs = lecteursToApiPayload(input.lecteurs);
  const chef = await resolveChefNameForSection(ctx.sectionId);

  const patch: Record<string, unknown> = {
    designation: input.designation.trim(),
    amount: Math.max(0, Number(input.amount) || 0),
    currency: (input.currency || "USD").trim(),
    description,
    matiere: {
      reference: programme.slug,
      designation: programme.designation,
      credit: programme.credits,
    },
    lecteurs,
    branding: {
      institut: "INBTP",
      sectionRef: ctx.sectionSlug,
      section: (input.brandingSectionLabel ?? ctx.sectionDesignation).trim() || ctx.sectionSlug,
      chef,
      contact,
      email: emailBranding,
      adresse,
    },
  };
  if (input.status?.trim()) patch.status = input.status.trim();

  const upstream = await fetchEtudiantApi(`/resources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Mise à jour impossible."));
  }
  const updated = payload.data ?? JSON.parse(rawText || "{}");
  const row = rowFromApi(updated);
  if (!row) throw new Error("Réponse service invalide après mise à jour.");
  return row;
}

export async function deleteOrganisateurSujetResourceAction(input: {
  sectionSlug: string;
  id: string;
}): Promise<{ ok: true }> {
  const ctx = await assertChargeRechercheContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre habilitation.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getOrganisateurSujetResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const upstream = await fetchEtudiantApi(`/resources/${id}`, { method: "DELETE" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Suppression impossible."));
  }
  return { ok: true };
}
