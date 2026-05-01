"use server";

import { Types } from "mongoose";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import type { DescriptionSectionInput, SujetCommandeListRow } from "@/actions/organisateurSujetResources";

export type { DescriptionSectionInput };

/** Métadonnées envoyées au service étudiant dans `matieres[]` (session). */
export type SessionMatiereInput = {
  reference: string;
  designation: string;
  credit: string;
};

export type SessionResourceRow = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  brandingSectionRef: string;
  matieresCount: number;
  /** Aperçu des programmes (matières) rattachés. */
  matieresSummary: string;
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

function normalizeSessionMatieresInput(
  matieres: SessionMatiereInput[]
): Array<{ reference: string; designation: string; credit: string }> {
  const rows = (Array.isArray(matieres) ? matieres : [])
    .map((x) => ({
      reference: String(x?.reference ?? "").trim(),
      designation: String(x?.designation ?? "").trim(),
      credit: String(x?.credit ?? "").trim(),
    }))
    .filter((x) => x.reference.length > 0);
  if (rows.length === 0) throw new Error("Sélectionnez au moins une matière.");
  return rows;
}

function rowFromApi(raw: unknown): SessionResourceRow | null {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const id = String(r._id ?? r.id ?? "").trim();
  if (!id) return null;
  const branding = r.branding && typeof r.branding === "object" ? (r.branding as Record<string, unknown>) : {};
  const matieres = Array.isArray(r.matieres) ? r.matieres : [];
  const labels: string[] = [];
  for (const m of matieres) {
    const o = m && typeof m === "object" ? (m as Record<string, unknown>) : {};
    const ref = String(o.reference ?? "").trim();
    const des = String(o.designation ?? "").trim();
    const lbl = des || ref;
    if (lbl) labels.push(lbl);
  }
  return {
    id,
    designation: String(r.designation ?? "").trim(),
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? "USD").trim() || "USD",
    status: String(r.status ?? "").trim(),
    brandingSectionRef: String(branding.sectionRef ?? "").trim(),
    matieresCount: labels.length,
    matieresSummary:
      labels.length === 0
        ? "—"
        : `${labels.slice(0, 4).join(" · ")}${labels.length > 4 ? "…" : ""}`,
  };
}

function assertPayloadResourceIsSession(raw: unknown) {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const cat = String(r.categorie ?? "").toLowerCase();
  if (cat && cat !== "session") {
    throw new Error("Cette ressource n'est pas une session d'examen (enrôlement).");
  }
}

function extractMatieresSelectionFromApi(raw: unknown): SessionMatiereInput[] {
  const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const matieres = Array.isArray(r.matieres) ? r.matieres : [];
  const out: SessionMatiereInput[] = [];
  for (const m of matieres) {
    const o = m && typeof m === "object" ? (m as Record<string, unknown>) : {};
    const reference = String(o.reference ?? "").trim();
    if (!reference) continue;
    const designation = String(o.designation ?? "").trim();
    const cred = o.credit ?? o.credits;
    let credit = "";
    if (typeof cred === "number" && Number.isFinite(cred) && cred > 0) credit = String(cred);
    else if (cred != null && cred !== "") {
      const n = Number(cred);
      if (Number.isFinite(n) && n > 0) credit = String(n);
    }
    out.push({ reference, designation, credit });
  }
  return out;
}

export async function listGestionnaireSessionResourcesAction(input: {
  sectionSlug: string;
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{ rows: SessionResourceRow[]; total: number; page: number; limit: number }> {
  const ctx = await assertGestionnaireSectionContext();
  if (input.sectionSlug !== ctx.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }

  const page = Math.max(1, input.page ?? 1);

  const limit = Math.max(1, Math.min(200, input.limit ?? 10));

  const sp = new URLSearchParams({

    categorie: "session",

    page: String(page),

    limit: String(limit),

  });

  sp.append("branding.sectionRef", ctx.sectionSlug);

  if (input.search?.trim()) sp.set("search", input.search.trim());



  const upstream = await fetchEtudiantApi(`/resources?${sp.toString()}`, { method: "GET" });

  const rawText = await upstream.text();

  const payload = readJsonPayload(upstream, rawText);

  if (!upstream.ok) {

    throw new Error(pickErrorMessage(payload, "Impossible de charger les sessions d'enrôlement."));

  }

  const data = Array.isArray(payload.data) ? payload.data : [];

  const meta = payload.meta && typeof payload.meta === "object" ? (payload.meta as Record<string, unknown>) : {};

  const total = typeof meta.total === "number" ? meta.total : data.length;

  const rows = data.map(rowFromApi).filter((x): x is SessionResourceRow => x != null);

  return {

    rows,

    total,

    page: typeof meta.page === "number" ? meta.page : page,

    limit: typeof meta.limit === "number" ? meta.limit : limit,

  };

}



export async function getGestionnaireSessionResourceAction(input: {

  sectionSlug: string;

  id: string;

}): Promise<

  SessionResourceRow & {

    descriptionSections: DescriptionSectionInput[];

    matieresSelection: SessionMatiereInput[];

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

  assertPayloadResourceIsSession(row);

  const base = rowFromApi(row);

  if (!base) throw new Error("Ressource invalide.");

  if (base.brandingSectionRef && base.brandingSectionRef !== ctx.sectionSlug) {

    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");

  }



  const r = row && typeof row === "object" ? (row as Record<string, unknown>) : {};

  const branding = r.branding && typeof r.branding === "object" ? (r.branding as Record<string, unknown>) : {};



  let descriptionSections = parseDescriptionSectionsFromApi(r.description);

  if (descriptionSections.length === 0) {

    descriptionSections = [{ title: "Description", contenu: [""] }];

  }



  const matieresSelection = extractMatieresSelectionFromApi(r);



  return {

    ...base,

    descriptionSections,

    matieresSelection,

    brandingSectionLabel: String(branding.section ?? "").trim(),

    brandingChef: String(branding.chef ?? "").trim(),

    brandingContact: String(branding.contact ?? "").trim(),

    brandingEmail: String(branding.email ?? "").trim(),

    brandingAdresse: String(branding.adresse ?? "").trim(),

  };

}



export async function createGestionnaireSessionResourceAction(input: {

  sectionSlug: string;

  designation: string;

  descriptionSections: DescriptionSectionInput[];

  amount: number;

  currency: string;

  matieres: SessionMatiereInput[];

  brandingSectionLabel?: string;

  brandingContact: string;

  brandingEmail: string;

  brandingAdresse: string;

}): Promise<SessionResourceRow> {

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



  const description = normalizeDescriptionSections(input.descriptionSections ?? []);

  const matieres = normalizeSessionMatieresInput(input.matieres);



  let chef = (await resolveChefNameForSection(ctx.sectionId)).trim();

  if (!chef) {

    chef =

      (input.brandingSectionLabel ?? ctx.sectionDesignation).trim() ||

      ctx.sectionSlug ||

      "—";

  }



  const body = {

    categorie: "session" as const,

    designation: input.designation.trim(),

    description,

    amount: Math.max(0, Number(input.amount) || 0),

    currency: (input.currency || "USD").trim(),

    status: "inactive" as const,

    matieres,

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

    row = await patchGestionnaireSessionResourceStatusAction({

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



export async function updateGestionnaireSessionResourceAction(input: {

  sectionSlug: string;

  id: string;

  designation: string;

  descriptionSections: DescriptionSectionInput[];

  amount: number;

  currency: string;

  matieres: SessionMatiereInput[];

  brandingSectionLabel?: string;

  brandingContact: string;

  brandingEmail: string;

  brandingAdresse: string;

  status?: string;

}): Promise<SessionResourceRow> {

  const ctx = await assertGestionnaireSectionContext();

  if (input.sectionSlug !== ctx.sectionSlug) {

    throw new Error("Section incohérente avec votre section d'attache.");

  }

  const id = String(input.id ?? "").trim();

  if (!id) throw new Error("Identifiant ressource requis.");



  await getGestionnaireSessionResourceAction({ sectionSlug: ctx.sectionSlug, id });



  const contact = String(input.brandingContact ?? "").trim();

  const emailBranding = String(input.brandingEmail ?? "").trim();

  const adresse = String(input.brandingAdresse ?? "").trim();

  if (!contact) throw new Error("Le contact (téléphone) du branding est requis.");

  if (!emailBranding) throw new Error("L’e-mail du branding est requis.");

  if (!adresse) throw new Error("L’adresse du branding est requise.");



  const description = normalizeDescriptionSections(input.descriptionSections ?? []);

  const matieres = normalizeSessionMatieresInput(input.matieres);



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

    matieres,

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



export async function patchGestionnaireSessionResourceStatusAction(input: {

  sectionSlug: string;

  id: string;

  status: "active" | "inactive";

}): Promise<SessionResourceRow> {

  const ctx = await assertGestionnaireSectionContext();

  if (input.sectionSlug !== ctx.sectionSlug) {

    throw new Error("Section incohérente avec votre section d'attache.");

  }

  const id = String(input.id ?? "").trim();

  if (!id) throw new Error("Identifiant ressource requis.");



  await getGestionnaireSessionResourceAction({ sectionSlug: ctx.sectionSlug, id });



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



export async function deleteGestionnaireSessionResourceAction(input: {

  sectionSlug: string;

  id: string;

}): Promise<void> {

  const ctx = await assertGestionnaireSectionContext();

  if (input.sectionSlug !== ctx.sectionSlug) {

    throw new Error("Section incohérente avec votre section d'attache.");

  }

  const id = String(input.id ?? "").trim();

  if (!id) throw new Error("Identifiant ressource requis.");



  await getGestionnaireSessionResourceAction({ sectionSlug: ctx.sectionSlug, id });



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

 * Commandes étudiant pour une ressource `categorie: session` — type commande `session`.

 */

export async function listSessionCommandesForResourceAction(input: {

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

  assertPayloadResourceIsSession(verifyRow);

  const row = rowFromApi(verifyRow);

  if (!row) throw new Error("Ressource invalide.");

  if (row.brandingSectionRef && row.brandingSectionRef !== ctx.sectionSlug) {

    throw new Error("Cette ressource n'appartient pas à votre section (sectionRef).");

  }



  const page = Math.max(1, input.page ?? 1);

  const limit = Math.max(1, Math.min(200, input.limit ?? 20));



  const criteria = JSON.stringify({ ressourceId: resourceId, type: "session" });

  const sp = new URLSearchParams({

    page: String(page),

    limit: String(limit),

    type: "session",

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

