"use server";

import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";
import { titulaireFetchChargesAll } from "@/lib/titulaire-service/chargesRemote";
import { AnneeModel } from "@/lib/models/Annee";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import { fetchTitulaireService, getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";
import { TITULAIRE_PRESENCE_STATUS_SET } from "@/lib/titulaire-presence/presenceStatus";

export type ChargePresenceTab = {
  id: string;
  label: string;
  matiereRef: string;
  programmeRef: string;
  programmeSlug: string;
  sectionSlug: string;
  matiereDesignation: string;
  programmeDesignation: string;
  anneeLabel: string;
};

export type AnneePresenceOption = {
  id: string;
  slug: string;
  designation: string;
  debut: number;
  fin: number;
  status: boolean;
};

export type SeanceListItem = {
  id: string;
  label: string;
  dateSeance: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  lecon: string;
  status: boolean;
};

export type PresenceRowView = {
  id: string;
  matricule: string;
  studentName: string;
  email: string;
  matiere: string;
  date: string;
  status: "present" | "absent" | "late" | "early" | "excused";
  /** GeoJSON Point [longitude, latitude] si fourni par le service */
  coordinates: [number, number] | null;
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

/** Extrait un tableau de séances quel que soit le wrapper API (`data`, `seances`, `data.seances`, etc.). */
function extractSeancesArrayFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];
  for (const key of ["data", "seances", "results", "items", "rows", "list"]) {
    const v = root[key];
    if (Array.isArray(v)) return v;
  }
  const dataObj = pickObject(root.data);
  if (dataObj) {
    for (const key of ["seances", "items", "rows", "list", "data"]) {
      const v = dataObj[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function extractPresenceLngLat(raw: Record<string, unknown>): [number, number] | null {
  const loc = raw.localisation ?? raw.location;
  if (!loc || typeof loc !== "object" || Array.isArray(loc)) return null;
  const o = loc as Record<string, unknown>;
  const c = o.coordinates;
  if (!Array.isArray(c) || c.length < 2) return null;
  const lng = Number(c[0]);
  const lat = Number(c[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return [lng, lat];
}

function extractPresenceArrayFromPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];
  for (const key of ["data", "presences", "results", "items", "rows", "list"]) {
    const v = root[key];
    if (Array.isArray(v)) return v;
  }
  const dataObj = pickObject(root.data);
  if (dataObj) {
    for (const key of ["presences", "items", "rows", "list", "data"]) {
      const v = dataObj[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function extractIdFromPayload(payload: unknown): string {
  if (Array.isArray(payload)) return "";
  const root = pickObject(payload);
  if (!root) return "";
  const direct = String(root._id ?? root.id ?? "").trim();
  if (direct) return direct;
  const candidates = [root.data, root.seance, root.result, root.payload];
  for (const c of candidates) {
    const o = pickObject(c);
    if (!o) continue;
    const nested = String(o._id ?? o.id ?? "").trim();
    if (nested) return nested;
  }
  return "";
}

function extractAnneeLabel(row: Record<string, unknown>): string {
  const annee = row.annee;
  if (annee && typeof annee === "object") {
    const o = annee as Record<string, unknown>;
    const slug = String(o.slug ?? "").trim();
    if (slug) return slug;
    const des = String(o.designation ?? "").trim();
    if (des) return des;
  }
  if (typeof annee === "string" && annee.trim()) return annee.trim();
  for (const key of ["anneeAcademique", "annee_academique", "anneeSlug", "annee_slug", "academicYear"]) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const s = String(o.slug ?? o.designation ?? "").trim();
      if (s) return s;
    }
  }
  const horaire = (row.horaire ?? {}) as Record<string, unknown>;
  const d1 = horaire.date_debut != null ? new Date(String(horaire.date_debut)) : null;
  if (!d1 || Number.isNaN(d1.getTime())) return "";
  const y1 = d1.getFullYear();
  const d2 = horaire.date_fin != null ? new Date(String(horaire.date_fin)) : null;
  if (!d2 || Number.isNaN(d2.getTime())) return String(y1);
  const y2 = d2.getFullYear();
  if (y1 === y2) return String(y1);
  const a = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  return `${a}-${b}`;
}

async function assertTitulaire() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "titulaire") {
    throw new Error("Accès réservé aux titulaires.");
  }
  await connectDB();
  const agent = await userManager.getUserByEmail("Agent", session.email);
  return {
    matricule: String((agent as { matricule?: string } | null)?.matricule ?? "").trim(),
    email: String(session.email ?? "").trim(),
  };
}

export async function loadTitulairePresencesPageData(): Promise<{
  chargeTabs: ChargePresenceTab[];
  annees: AnneePresenceOption[];
}> {
  const auth = await assertTitulaire();
  const res = await titulaireFetchChargesAll({
    titulaire_matricule: auth.matricule || undefined,
    titulaire_email: auth.email || undefined,
  });
  if (!res.ok) throw new Error(`Service charges indisponible (${res.status})`);

  const rawTabs: ChargePresenceTab[] = [];
  for (const row of res.items as Array<Record<string, unknown>>) {
    const matiere = (row.matiere ?? {}) as Record<string, unknown>;
    const promotion = (row.promotion ?? {}) as Record<string, unknown>;
    const id = String(row._id ?? row.id ?? "").trim();
    const programmeRef = String(promotion.reference ?? "").trim();
    const matiereRef = String(matiere.reference ?? "").trim();
    if (!id || !programmeRef || !Types.ObjectId.isValid(programmeRef) || !matiereRef) continue;

    const prog = await ProgrammeModel.findById(new Types.ObjectId(programmeRef))
      .select("designation slug section")
      .lean();
    if (!prog?.section) continue;
    const section = await SectionModel.findById(prog.section).select("slug").lean();
    if (!section?.slug) continue;

    const mat = String(matiere.designation ?? "Cours").trim();
    const promo = String(promotion.designation ?? "Promotion").trim();
    const anneeLabel = extractAnneeLabel(row);
    rawTabs.push({
      id,
      label: "",
      matiereRef,
      programmeRef,
      programmeSlug: String(prog.slug ?? ""),
      sectionSlug: String(section.slug ?? ""),
      matiereDesignation: mat,
      programmeDesignation: String(prog.designation ?? promotion.designation ?? ""),
      anneeLabel,
    });
  }

  const labelCount = new Map<string, number>();
  for (const t of rawTabs) {
    const base = t.anneeLabel
      ? `${t.matiereDesignation} · ${t.programmeDesignation} · ${t.anneeLabel}`
      : `${t.matiereDesignation} · ${t.programmeDesignation}`;
    labelCount.set(base, (labelCount.get(base) ?? 0) + 1);
  }
  const chargeTabs = rawTabs.map((t) => {
    const base = t.anneeLabel
      ? `${t.matiereDesignation} · ${t.programmeDesignation} · ${t.anneeLabel}`
      : `${t.matiereDesignation} · ${t.programmeDesignation}`;
    const label = (labelCount.get(base) ?? 0) > 1 ? `${base} · #${t.id.slice(-6)}` : base;
    return { ...t, label };
  });

  const anneesRaw = await AnneeModel.find().select("_id designation slug debut fin status").sort({ debut: -1 }).lean();
  const annees: AnneePresenceOption[] = anneesRaw.map((a) => ({
    id: String(a._id),
    slug: String(a.slug ?? ""),
    designation: String(a.designation ?? ""),
    debut: Number(a.debut ?? 0),
    fin: Number(a.fin ?? 0),
    status: Boolean(a.status),
  }));

  return { chargeTabs, annees };
}

export async function listSeancesForCharge(chargeId: string): Promise<SeanceListItem[]> {
  await assertTitulaire();
  const id = String(chargeId ?? "").trim();
  if (!id) return [];

  const path = `/seances/charge/${encodeURIComponent(id)}`;
  const base = getTitulaireServiceBase() ?? "";
  const fullUrl = `${base}${path}`;
  console.log("[titulaire-presences] listSeancesForCharge → GET", fullUrl, "| chargeId=", id);

  const res = await fetchTitulaireService(path, {
    method: "GET",
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const errObj = pickObject(payload);
    const msg = String(
      errObj?.message ?? errObj?.error ?? "Impossible de charger les séances."
    );
    console.error("[titulaire-presences] listSeancesForCharge HTTP", res.status, msg, payload);
    throw new Error(msg);
  }

  const rows = extractSeancesArrayFromPayload(payload);
  console.log("[titulaire-presences] listSeancesForCharge réponse", {
    status: res.status,
    payloadIsArray: Array.isArray(payload),
    payloadKeys: Array.isArray(payload) ? "(racine tableau)" : Object.keys((payload ?? {}) as object),
    rowCountRaw: rows.length,
    firstKeys: rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0] as object) : [],
  });

  const mapped = rows
    .map((raw) => {
      const x = (raw ?? {}) as Record<string, unknown>;
      const nested = pickObject(x.seance);
      const idRaw = String(
        x._id ?? x.id ?? x.seanceId ?? x.seance_id ?? nested?._id ?? nested?.id ?? ""
      ).trim();
      const idVal = normalizeMongoObjectIdString(idRaw) ?? idRaw;
      const dateRaw = x.date ?? x.dateSeance ?? nested?.date;
      const d = dateRaw != null ? new Date(String(dateRaw)) : null;
      return {
        id: idVal,
        label: String(x.lecon ?? nested?.lecon ?? "").trim() || "Séance",
        dateSeance: d && !Number.isNaN(d.getTime()) ? d.toISOString() : "",
        jour: String(x.jour ?? nested?.jour ?? ""),
        heureDebut: String(x.heure_debut ?? x.heureDebut ?? nested?.heure_debut ?? nested?.heureDebut ?? ""),
        heureFin: String(x.heure_fin ?? x.heureFin ?? nested?.heure_fin ?? nested?.heureFin ?? ""),
        salle: String(x.salle ?? nested?.salle ?? ""),
        lecon: String(x.lecon ?? nested?.lecon ?? ""),
        status: Boolean(x.status ?? nested?.status),
      } satisfies SeanceListItem;
    })
    .filter((x) => x.id);

  if (mapped.length === 0 && rows.length > 0) {
    console.warn(
      "[titulaire-presences] listSeancesForCharge: lignes reçues mais aucun _id/id exploitable. Exemple 1ère ligne:",
      JSON.stringify(rows[0]).slice(0, 500)
    );
  }

  return mapped;
}

export async function createTitulaireSeance(input: {
  chargeId: string;
  jour: string;
  heure_debut: string;
  heure_fin: string;
  date: string;
  salle: string;
  lecon: string;
  description?: Array<{ title: string; contenu: string[] }>;
  status?: boolean;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const auth = await assertTitulaire();
  const chargeId = String(input.chargeId ?? "").trim();
  if (!chargeId) return { ok: false, message: "Charge invalide." };

  const res = await titulaireFetchChargesAll({
    titulaire_matricule: auth.matricule || undefined,
    titulaire_email: auth.email || undefined,
  });
  if (!res.ok) return { ok: false, message: `Service charges indisponible (${res.status})` };
  const allowed = (res.items as Array<Record<string, unknown>>).some(
    (row) => String(row._id ?? row.id ?? "").trim() === chargeId
  );
  if (!allowed) return { ok: false, message: "Cette charge ne vous appartient pas." };
  const body = {
    charge_horaire: chargeId,
    jour: String(input.jour ?? "").trim(),
    heure_debut: String(input.heure_debut ?? "").trim(),
    heure_fin: String(input.heure_fin ?? "").trim(),
    date: String(input.date ?? "").trim(),
    salle: String(input.salle ?? "").trim(),
    lecon: String(input.lecon ?? "").trim(),
    description: Array.isArray(input.description) ? input.description : [],
    status: input.status ?? true,
  };
  const createPath = "/seances/add";
  const createBase = getTitulaireServiceBase() ?? "";
  console.log("[titulaire-presences] createTitulaireSeance → POST", `${createBase}${createPath}`, body);

  const createRes = await fetchTitulaireService(createPath, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const created = await createRes.json().catch(() => ({} as unknown));
  if (!createRes.ok) {
    const err = pickObject(created);
    return { ok: false, message: String(err?.message ?? err?.error ?? "Création de séance impossible.") };
  }
  const id = extractIdFromPayload(created);
  if (!id) return { ok: false, message: "Séance créée mais identifiant introuvable." };
  return { ok: true, id };
}

export async function getTitulaireSeanceDetail(seanceId: string): Promise<{
  id: string;
  label: string;
  dateSeance: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  lecon: string;
  chargeId: string;
} | null> {
  await assertTitulaire();
  const id = String(seanceId ?? "").trim();
  if (!id || !Types.ObjectId.isValid(id)) return null;
  const seanceRes = await fetchTitulaireService(`/seances/${encodeURIComponent(id)}`, { method: "GET" });
  const body = await seanceRes.json().catch(() => null);
  if (!seanceRes.ok || body == null || Array.isArray(body)) return null;
  const root = pickObject(body);
  if (!root) return null;
  const seanceRaw = (pickObject(root.data) ?? root) as Record<string, unknown>;

  const ch = seanceRaw.charge_horaire;
  let chargeId = "";
  if (ch && typeof ch === "object" && !Array.isArray(ch)) {
    const chObj = ch as Record<string, unknown>;
    chargeId = String(chObj._id ?? chObj.id ?? "").trim();
  } else {
    chargeId = String(ch ?? "").trim();
  }

  return {
    id: String(seanceRaw._id ?? seanceRaw.id ?? ""),
    label: String(seanceRaw.lecon ?? "").trim() || "Séance",
    dateSeance: seanceRaw.date ? new Date(String(seanceRaw.date)).toISOString() : "",
    jour: String(seanceRaw.jour ?? ""),
    heureDebut: String(seanceRaw.heure_debut ?? ""),
    heureFin: String(seanceRaw.heure_fin ?? ""),
    salle: String(seanceRaw.salle ?? ""),
    lecon: String(seanceRaw.lecon ?? ""),
    chargeId,
  };
}

export async function listPresencesForSeance(seanceId: string): Promise<PresenceRowView[]> {
  await assertTitulaire();
  const id = String(seanceId ?? "").trim();
  if (!id || !Types.ObjectId.isValid(id)) return [];
  const presenceRes = await fetchTitulaireService(`/presences/seance/${encodeURIComponent(id)}`, {
    method: "GET",
  });
  const presenceBody = await presenceRes.json().catch(() => ({}));
  if (!presenceRes.ok) {
    const err = pickObject(presenceBody);
    throw new Error(String(err?.message ?? err?.error ?? "Impossible de charger les présences."));
  }
  const rowsRaw = extractPresenceArrayFromPayload(presenceBody);
  const mapped = rowsRaw.map((raw) => {
    const x = (raw ?? {}) as Record<string, unknown>;
    const d = x.date != null ? new Date(String(x.date)) : null;
    return {
      id: String(x._id ?? x.id ?? "").trim(),
      matricule: String(x.matricule ?? "").trim(),
      studentName: String(x.studentName ?? x.nomComplet ?? "").trim() || "—",
      email: String(x.email ?? "").trim(),
      matiere: String(x.matiere ?? "").trim(),
      date: d && !Number.isNaN(d.getTime()) ? d.toISOString() : "",
      status: String(x.status ?? "absent") as PresenceRowView["status"],
      coordinates: extractPresenceLngLat(x),
    };
  });

  console.log("[titulaire-presences] listPresencesForSeance ← réponse service titulaire", {
    seanceId: id,
    httpStatus: presenceRes.status,
    corpsBrut: presenceBody,
    nombreLignesExtraites: rowsRaw.length,
    lignesBrutes: rowsRaw,
    lignesPourUI: mapped,
  });

  return mapped;
}

/**
 * Appel HTTP vers `PATCH|PUT /presences/update/:id` (sans vérif. session — usage interne après `assertTitulaire`).
 * Aligné sur le routeur titulaire (`Presences.Update: '/update/:id'`) et `findByIdAndUpdate(id, req.body, { new: true })`.
 */
async function requestTitulairePresenceUpdate(
  presenceId: string,
  body: Record<string, unknown>
): Promise<void> {
  const id = String(presenceId ?? "").trim();
  if (!id || !Types.ObjectId.isValid(id)) {
    throw new Error("Identifiant de présence invalide.");
  }

  const path = `/presences/update/${encodeURIComponent(id)}`;
  const base = getTitulaireServiceBase() ?? "";
  const fullUrl = `${base.replace(/\/+$/, "")}${path}`;

  const init: RequestInit = {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };

  console.log("[titulaire-presences] URL:", fullUrl);
  console.log("[titulaire-presences] Payload:", init.body);

  let res = await fetchTitulaireService(path, { ...init, method: "PATCH" });
  if (res.ok) return;

  if (res.status === 405) {
    console.log("[titulaire-presences] URL (PUT):", fullUrl);
    console.log("[titulaire-presences] Payload (PUT):", init.body);
    res = await fetchTitulaireService(path, { ...init, method: "PUT" });
    if (res.ok) return;
  }

  const payload = await res.json().catch(() => ({}));
  const err = pickObject(payload);
  throw new Error(String(err?.message ?? err?.error ?? `Échec modification présence (${res.status}).`));
}

/**
 * Mise à jour d’une présence (enseignant) : même contrat que le service Express (`req.body` → update document).
 * Exemple : `updateTitulairePresenceById(id, { status: "present" })`.
 */
export async function updateTitulairePresenceById(
  presenceId: string,
  body: Record<string, unknown>
): Promise<void> {
  await assertTitulaire();
  await requestTitulairePresenceUpdate(presenceId, body);
}

export async function updatePresencesForSeance(
  entries: Array<{ id: string; status: PresenceRowView["status"] }>
): Promise<{ ok: true; updated: number }> {
  await assertTitulaire();
  const normalized = entries
    .map((e) => ({ id: String(e.id ?? "").trim(), status: String(e.status ?? "").trim() }))
    .filter((e) => e.id && TITULAIRE_PRESENCE_STATUS_SET.has(e.status));

  if (normalized.length === 0) return { ok: true, updated: 0 };

  let updated = 0;
  for (const row of normalized) {
    await requestTitulairePresenceUpdate(row.id, { status: row.status });
    updated += 1;
  }

  return { ok: true, updated };
}
