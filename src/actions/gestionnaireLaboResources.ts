"use server";

import { Types } from "mongoose";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import type { DescriptionSectionInput, SujetCommandeListRow } from "@/actions/organisateurSujetResources";

export type { DescriptionSectionInput };

export type LaboResourceRow = {
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

async function loadJuryCoursMemberIds(sectionId: string): Promise<Set<string>> {
  if (!Types.ObjectId.isValid(sectionId)) return new Set();
  await connectDB();
  const doc = await SectionModel.findById(sectionId).select("jury.cours").lean();
  const ids = new Set<string>();
  const jr = doc?.jury?.cours;
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

async function assertLecteursInJuryCours(sectionId: string, lecteurs: LecteurAgentPayload[]) {
  const allowed = await loadJuryCoursMemberIds(sectionId);
  if (allowed.size === 0) {
    throw new Error("Aucun membre n'est configuré dans le jury de cours de cette section.");
  }
  for (const l of lecteurs) {
    const id = String(l.id ?? "").trim();
    if (!id || !allowed.has(id)) {
      throw new Error("Chaque encadrant doit être choisi parmi les membres du jury de cours de la section.");
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

/** Schéma Zod service étudiant : `categorie: "labo"` → `titulaire` (userRef), pas `lecteurs`. */
function firstEncadrantToTitulairePayload(lecteurs: LecteurAgentPayload[]): {
  nom: string;
  reference: string;
  email: string;
  matricule: string;
} {
  const t = lecteursToApiPayload(lecteurs)[0];
  return {
    nom: t.nom,
    reference: t.reference,
    email: t.email,
    matricule: t.matricule,
  };
}

function collectStageLecteurLikeRows(r: Record<string, unknown>): unknown[] {
  const fromLecteurs = Array.isArray(r.lecteurs) ? r.lecteurs : [];
  if (fromLecteurs.length > 0) return fromLecteurs;
  const tit = r.titulaire;
  if (tit && typeof tit === "object") return [tit];
  return [];
}

async function assertGestionnaireSectionContext() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    throw new Error("Accès réservé aux gestionnaires.");
  }
  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope?.sectionSlug) {
    throw new Error("Aucune section locale trouvée pour ce gestionnaire.");
  }
  return {
    agentSub: session.sub,
    sectionId: scope.sectionId,
    sectionSlug: scope.sectionSlug,
    sectionDesignation: scope.sectionDesignation,
  };
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

/** Enrichit le message avec issues / errors souvent renvoyés par les validateurs côté service. */
function formatEtudiantApiError(payload: Record<string, unknown>, base: string): string {
  const parts: string[] = [];
  const collect = (raw: unknown) => {
    if (!Array.isArray(raw)) return;
    for (const item of raw) {
      if (!item) continue;
      if (typeof item === "string") {
        parts.push(item);
        continue;
      }
      if (typeof item === "object") {
        const o = item as Record<string, unknown>;
        const m = o.message ?? o.msg ?? o.error;
        const p = o.path;
        const pathStr = Array.isArray(p) ? p.join(".") : typeof p === "string" ? p : "";
        if (typeof m === "string" && m) {
          parts.push(pathStr ? `${pathStr}: ${m}` : m);
        }
      }
    }
  };
  collect(payload.errors);
  collect(payload.issues);
  collect(payload.details);
  if (parts.length === 0) return base;
  return `${base} — ${parts.join(" · ")}`;
}

function assertPayloadResourceIsLabo(raw: unknown) {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cat = String(r.categorie ?? "").toLowerCase();
  if (cat && cat !== "labo") {
    throw new Error("Cette ressource n'est pas un bon de laboratoire.");
  }
}

function rowFromApi(raw: unknown): LaboResourceRow | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = String(r._id ?? r.id ?? "").trim();
  if (!id) return null;
  const matiere = r.matiere && typeof r.matiere === "object" ? (r.matiere as Record<string, unknown>) : {};
  const lecteurs = collectStageLecteurLikeRows(r);
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

export async function listGestionnaireLaboResourcesAction(input: {
  sectionSlug: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ rows: LaboResourceRow[]; total: number; page: number; limit: number }> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(200, input.limit ?? 10));
  const sp = new URLSearchParams({
    categorie: "labo",
    page: String(page),
    limit: String(limit),
  });
  sp.append("branding.sectionRef", ctx.sectionSlug);
  if (input.search?.trim()) sp.set("search", input.search.trim());

  const upstream = await fetchEtudiantApi(`/resources?${sp.toString()}`, { method: "GET" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Impossible de charger les bons de laboratoire."));
  }
  const data = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta && typeof payload.meta === "object" ? (payload.meta as Record<string, unknown>) : {};
  const total = typeof meta.total === "number" ? meta.total : data.length;
  const rows = data.map(rowFromApi).filter((x): x is LaboResourceRow => x != null);
  return {
    rows,
    total,
    page: typeof meta.page === "number" ? meta.page : page,
    limit: typeof meta.limit === "number" ? meta.limit : limit,
  };
}

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

export async function listLaboCommandesForResourceAction(input: {
  sectionSlug: string;
  resourceId: string;
  page?: number;
  limit?: number;
}): Promise<{ rows: SujetCommandeListRow[]; total: number; page: number; limit: number }> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
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
  assertPayloadResourceIsLabo(verifyRow);
  const row = rowFromApi(verifyRow);
  if (!row) throw new Error("Ressource invalide.");
  if (row.brandingSectionRef && row.brandingSectionRef !== ctx.sectionSlug) {
    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");
  }

  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(200, input.limit ?? 20));

  const criteria = JSON.stringify({ ressourceId: resourceId, type: "labo" });
  const sp = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: "labo",
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

export async function getGestionnaireLaboResourceAction(input: {
  sectionSlug: string;
  id: string;
}): Promise<
  LaboResourceRow & {
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
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
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
  assertPayloadResourceIsLabo(row);
  const base = rowFromApi(row);
  if (!base) throw new Error("Ressource invalide.");
  if (base.brandingSectionRef && base.brandingSectionRef !== ctx.sectionSlug) {
    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");
  }
  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const lecteurs = collectStageLecteurLikeRows(r);
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

export async function createGestionnaireLaboResourceAction(input: {
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
}): Promise<LaboResourceRow> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }

  const contact = String(input.brandingContact ?? "").trim();
  const emailBranding = String(input.brandingEmail ?? "").trim();
  const adresse = String(input.brandingAdresse ?? "").trim();
  if (!contact) throw new Error("Le contact (téléphone ou personne) du branding est requis.");
  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");
  if (!adresse) throw new Error("L’adresse du branding est requise.");

  const description = normalizeDescriptionSections(input.descriptionSections ?? []);

  const programme = await resolveProgrammeForSection(ctx.sectionId, input.programmeSlug);
  await assertLecteursInJuryCours(ctx.sectionId, input.lecteurs);
  const titulaire = firstEncadrantToTitulairePayload(input.lecteurs);
  let chef = (await resolveChefNameForSection(ctx.sectionId)).trim();
  if (!chef) {
    chef =
      (input.brandingSectionLabel ?? ctx.sectionDesignation).trim() ||
      ctx.sectionSlug ||
      "—";
  }

  /* POST aligné sur `resourceLaboSchema` (Zod) : `titulaire`, `description`, `status: inactive` — pas `lecteurs`. */
  const body = {
    categorie: "labo" as const,
    designation: input.designation.trim(),
    description,
    amount: Math.max(0, Number(input.amount) || 0),
    currency: (input.currency || "USD").trim(),
    status: "inactive" as const,
    matiere: {
      reference: programme.slug,
      designation: programme.designation,
      credit: programme.credits > 0 ? String(programme.credits) : "",
    },
    titulaire,
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
    throw new Error(formatEtudiantApiError(payload, pickErrorMessage(payload, "Création de la ressource impossible.")));
  }
  const created = payload.data ?? JSON.parse(rawText || "{}");
  let row = rowFromApi(created);
  if (!row) throw new Error("Réponse service invalide après création.");

  /* S’assure que la publication reste inactive si le service a normalisé le statut à la création. */
  try {
    row = await patchGestionnaireLaboResourceStatusAction({
      sectionSlug: input.sectionSlug,
      id: row.id,
      status: "inactive",
    });
  } catch (e) {
    throw new Error(
      `${(e as Error).message} — La ressource a peut‑être été créée sans statut « inactive » ; vérifiez sur le service étudiant.`
    );
  }

  return row;
}

export async function updateGestionnaireLaboResourceAction(input: {
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
}): Promise<LaboResourceRow> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getGestionnaireLaboResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const description = normalizeDescriptionSections(input.descriptionSections ?? []);

  const contact = String(input.brandingContact ?? "").trim();
  const emailBranding = String(input.brandingEmail ?? "").trim();
  const adresse = String(input.brandingAdresse ?? "").trim();
  if (!contact) throw new Error("Le contact (téléphone ou personne) du branding est requis.");
  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");
  if (!adresse) throw new Error("L’adresse du branding est requise.");

  const programme = await resolveProgrammeForSection(ctx.sectionId, input.programmeSlug);
  await assertLecteursInJuryCours(ctx.sectionId, input.lecteurs);
  const titulaire = firstEncadrantToTitulairePayload(input.lecteurs);
  let chef = (await resolveChefNameForSection(ctx.sectionId)).trim();
  if (!chef) {
    chef =
      (input.brandingSectionLabel ?? ctx.sectionDesignation).trim() ||
      ctx.sectionSlug ||
      "—";
  }

  const patch: Record<string, unknown> = {
    designation: input.designation.trim(),
    amount: Math.max(0, Number(input.amount) || 0),
    currency: (input.currency || "USD").trim(),
    description,
    matiere: {
      reference: programme.slug,
      designation: programme.designation,
      credit: programme.credits > 0 ? String(programme.credits) : "",
    },
    titulaire,
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

/**
 * Bascule le statut de publication (PATCH partiel). Valeurs typiques côté service : active | inactive.
 */
export async function patchGestionnaireLaboResourceStatusAction(input: {
  sectionSlug: string;
  id: string;
  status: "active" | "inactive";
}): Promise<LaboResourceRow> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getGestionnaireLaboResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const upstream = await fetchEtudiantApi(`/resources/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: input.status }),
  });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Mise à jour du statut impossible."));
  }
  const updated = payload.data ?? JSON.parse(rawText || "{}");
  const row = rowFromApi(updated);
  if (!row) throw new Error("Réponse service invalide après mise à jour du statut.");
  return row;
}

export async function deleteGestionnaireLaboResourceAction(input: {
  sectionSlug: string;
  id: string;
}): Promise<void> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getGestionnaireLaboResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const upstream = await fetchEtudiantApi(`/resources/${id}`, { method: "DELETE" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Suppression impossible."));
  }
}
