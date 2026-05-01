"use server";

import { Types } from "mongoose";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import type { DescriptionSectionInput, SujetCommandeListRow } from "@/actions/organisateurSujetResources";

export type { DescriptionSectionInput };

export type ReleveResourceRow = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  brandingSectionRef: string;
  programmeClasse: string;
  programmeFiliere: string;
  programmeCredits: number;
  anneeSlug: string;
};

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

function rowFromApi(raw: unknown): ReleveResourceRow | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = String(r._id ?? r.id ?? "").trim();
  if (!id) return null;
  const branding = r.branding && typeof r.branding === "object" ? (r.branding as Record<string, unknown>) : {};
  const programme =
    r.programme && typeof r.programme === "object" ? (r.programme as Record<string, unknown>) : {};
  const annee = r.annee && typeof r.annee === "object" ? (r.annee as Record<string, unknown>) : {};
  const credRaw = programme.credits;
  let programmeCredits = 0;
  if (typeof credRaw === "number" && Number.isFinite(credRaw)) programmeCredits = Math.max(0, credRaw);
  else if (credRaw != null && credRaw !== "") {
    const n = Number(credRaw);
    if (Number.isFinite(n)) programmeCredits = Math.max(0, n);
  }
  return {
    id,
    designation: String(r.designation ?? "").trim(),
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? "USD").trim() || "USD",
    status: String(r.status ?? "").trim(),
    brandingSectionRef: String(branding.sectionRef ?? "").trim(),
    programmeClasse: String(programme.classe ?? "").trim(),
    programmeFiliere: String(programme.filiere ?? "").trim(),
    programmeCredits,
    anneeSlug: String(annee.slug ?? "").trim(),
  };
}

function assertPayloadResourceIsReleve(raw: unknown) {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cat = String(r.categorie ?? "").toLowerCase();
  if (cat && cat !== "releve") {
    throw new Error("Cette ressource n'est pas un relevé de cotes.");
  }
}

export async function listGestionnaireReleveResourcesAction(input: {
  sectionSlug: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ rows: ReleveResourceRow[]; total: number; page: number; limit: number }> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(200, input.limit ?? 10));
  const sp = new URLSearchParams({
    categorie: "releve",
    page: String(page),
    limit: String(limit),
  });
  sp.append("branding.sectionRef", ctx.sectionSlug);
  if (input.search?.trim()) sp.set("search", input.search.trim());

  const upstream = await fetchEtudiantApi(`/resources?${sp.toString()}`, { method: "GET" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Impossible de charger les relevés de cotes."));
  }
  const data = Array.isArray(payload.data) ? payload.data : [];
  const meta = payload.meta && typeof payload.meta === "object" ? (payload.meta as Record<string, unknown>) : {};
  const total = typeof meta.total === "number" ? meta.total : data.length;
  const rows = data.map(rowFromApi).filter((x): x is ReleveResourceRow => x != null);
  return {
    rows,
    total,
    page: typeof meta.page === "number" ? meta.page : page,
    limit: typeof meta.limit === "number" ? meta.limit : limit,
  };
}

export async function getGestionnaireReleveResourceAction(input: {
  sectionSlug: string;
  id: string;
}): Promise<
  ReleveResourceRow & {
    descriptionSections: DescriptionSectionInput[];
    programmeSlug: string;
    brandingSectionLabel: string;
    brandingChef: string;
    brandingContact: string;
    brandingEmail: string;
    brandingAdresse: string;
    anneeDebut: string;
    anneeFin: string;
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
  assertPayloadResourceIsReleve(row);
  const base = rowFromApi(row);
  if (!base) throw new Error("Ressource invalide.");
  if (base.brandingSectionRef && base.brandingSectionRef !== ctx.sectionSlug) {
    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");
  }

  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
  const prog =
    r.programme && typeof r.programme === "object" ? (r.programme as Record<string, unknown>) : {};
  const annee = r.annee && typeof r.annee === "object" ? (r.annee as Record<string, unknown>) : {};
  const branding = r.branding && typeof r.branding === "object" ? (r.branding as Record<string, unknown>) : {};

  const filiere = String(prog.filiere ?? "").trim();
  let programmeSlug = "";
  if (filiere && Types.ObjectId.isValid(ctx.sectionId)) {
    await connectDB();
    const bySlug = await ProgrammeModel.findOne({
      section: new Types.ObjectId(ctx.sectionId),
      slug: filiere,
    })
      .select("slug")
      .lean();
    if (bySlug) programmeSlug = String((bySlug as { slug?: string }).slug ?? "").trim();
    if (!programmeSlug) {
      const byDes = await ProgrammeModel.findOne({
        section: new Types.ObjectId(ctx.sectionId),
        designation: filiere,
      })
        .select("slug")
        .lean();
      if (byDes) programmeSlug = String((byDes as { slug?: string }).slug ?? "").trim();
    }
  }
  if (!programmeSlug) programmeSlug = filiere;

  let descriptionSections = parseDescriptionSectionsFromApi(r.description);
  if (descriptionSections.length === 0) {
    descriptionSections = [{ title: "Description", contenu: [""] }];
  }

  return {
    ...base,
    descriptionSections,
    programmeSlug,
    brandingSectionLabel: String(branding.section ?? "").trim(),
    brandingChef: String(branding.chef ?? "").trim(),
    brandingContact: String(branding.contact ?? "").trim(),
    brandingEmail: String(branding.email ?? "").trim(),
    brandingAdresse: String(branding.adresse ?? "").trim(),
    anneeDebut: String(annee.debut ?? "").trim(),
    anneeFin: String(annee.fin ?? "").trim(),
  };
}

export async function createGestionnaireReleveResourceAction(input: {
  sectionSlug: string;
  sectionCycle: string;
  designation: string;
  descriptionSections: DescriptionSectionInput[];
  amount: number;
  currency: string;
  programmeSlug: string;
  anneeSlug: string;
  anneeDebut?: string;
  anneeFin?: string;
  brandingSectionLabel?: string;
  brandingContact: string;
  brandingEmail: string;
  brandingAdresse: string;
}): Promise<ReleveResourceRow> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }

  const contact = String(input.brandingContact ?? "").trim();
  const emailBranding = String(input.brandingEmail ?? "").trim();
  const adresse = String(input.brandingAdresse ?? "").trim();
  if (!contact) throw new Error("Le contact (téléphone) du branding est requis.");
  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");
  if (!adresse) throw new Error("L’adresse du branding est requise.");

  const anneeSlug = String(input.anneeSlug ?? "").trim();
  if (!anneeSlug) throw new Error("L’année académique est requise.");

  const description = normalizeDescriptionSections(input.descriptionSections ?? []);
  const programme = await resolveProgrammeForSection(ctx.sectionId, input.programmeSlug);
  const classe = String(input.sectionCycle ?? "").trim() || "—";
  let chef = (await resolveChefNameForSection(ctx.sectionId)).trim();
  if (!chef) {
    chef =
      (input.brandingSectionLabel ?? ctx.sectionDesignation).trim() ||
      ctx.sectionSlug ||
      "—";
  }

  const body = {
    categorie: "releve" as const,
    designation: input.designation.trim(),
    description,
    amount: Math.max(0, Number(input.amount) || 0),
    currency: (input.currency || "USD").trim(),
    status: "inactive" as const,
    programme: {
      classe,
      filiere: programme.slug,
      credits: programme.credits,
    },
    annee: {
      slug: anneeSlug,
      debut: String(input.anneeDebut ?? "").trim(),
      fin: String(input.anneeFin ?? "").trim(),
    },
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
    throw new Error(formatEtudiantApiError(payload, pickErrorMessage(payload, "Création impossible.")));
  }
  const created = payload.data ?? JSON.parse(rawText || "{}");
  let row = rowFromApi(created);
  if (!row) throw new Error("Réponse service invalide après création.");

  try {
    row = await patchGestionnaireReleveResourceStatusAction({
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

export async function updateGestionnaireReleveResourceAction(input: {
  sectionSlug: string;
  id: string;
  sectionCycle: string;
  designation: string;
  descriptionSections: DescriptionSectionInput[];
  amount: number;
  currency: string;
  programmeSlug: string;
  anneeSlug: string;
  anneeDebut?: string;
  anneeFin?: string;
  brandingSectionLabel?: string;
  brandingContact: string;
  brandingEmail: string;
  brandingAdresse: string;
  status?: string;
}): Promise<ReleveResourceRow> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getGestionnaireReleveResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const contact = String(input.brandingContact ?? "").trim();
  const emailBranding = String(input.brandingEmail ?? "").trim();
  const adresse = String(input.brandingAdresse ?? "").trim();
  if (!contact) throw new Error("Le contact (téléphone) du branding est requis.");
  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");
  if (!adresse) throw new Error("L’adresse du branding est requise.");

  const anneeSlug = String(input.anneeSlug ?? "").trim();
  if (!anneeSlug) throw new Error("L’année académique est requise.");

  const description = normalizeDescriptionSections(input.descriptionSections ?? []);
  const programme = await resolveProgrammeForSection(ctx.sectionId, input.programmeSlug);
  const classe = String(input.sectionCycle ?? "").trim() || "—";
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
    programme: {
      classe,
      filiere: programme.slug,
      credits: programme.credits,
    },
    annee: {
      slug: anneeSlug,
      debut: String(input.anneeDebut ?? "").trim(),
      fin: String(input.anneeFin ?? "").trim(),
    },
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
  const out = rowFromApi(updated);
  if (!out) throw new Error("Réponse service invalide après mise à jour.");
  return out;
}

export async function patchGestionnaireReleveResourceStatusAction(input: {
  sectionSlug: string;
  id: string;
  status: "active" | "inactive";
}): Promise<ReleveResourceRow> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getGestionnaireReleveResourceAction({ sectionSlug: ctx.sectionSlug, id });

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

export async function deleteGestionnaireReleveResourceAction(input: {
  sectionSlug: string;
  id: string;
}): Promise<void> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant ressource requis.");

  await getGestionnaireReleveResourceAction({ sectionSlug: ctx.sectionSlug, id });

  const upstream = await fetchEtudiantApi(`/resources/${id}`, { method: "DELETE" });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) {
    throw new Error(pickErrorMessage(payload, "Suppression impossible."));
  }
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

/**
 * Commandes étudiant pour une ressource `categorie: releve` — type commande `resultat` (service étudiant).
 */
export async function listReleveCommandesForResourceAction(input: {
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
  assertPayloadResourceIsReleve(verifyRow);
  const row = rowFromApi(verifyRow);
  if (!row) throw new Error("Ressource invalide.");
  if (row.brandingSectionRef && row.brandingSectionRef !== ctx.sectionSlug) {
    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");
  }

  const page = Math.max(1, input.page ?? 1);
  const limit = Math.max(1, Math.min(200, input.limit ?? 20));

  const criteria = JSON.stringify({ ressourceId: resourceId, type: "resultat" });
  const sp = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type: "resultat",
    criteria,
  });

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
