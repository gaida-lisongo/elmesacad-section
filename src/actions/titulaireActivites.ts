"use server";

import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";
import { titulaireFetchChargesAll } from "@/lib/titulaire-service/chargesRemote";
import { ProgrammeModel } from "@/lib/models/Programme";
import { fetchTitulaireService } from "@/lib/service-auth/upstreamFetch";

export type ActiviteCategorie = "TP" | "QCM";

export type ChargeActiviteTab = {
  id: string;
  label: string;
  matiereDesignation: string;
  programmeDesignation: string;
  anneeLabel: string;
};

export type ActiviteListItem = {
  id: string;
  chargeId: string;
  categorie: ActiviteCategorie;
  dateRemise: string;
  status: string;
  noteMaximale: number;
  montant: number;
  currency: string;
  qcmCount: number;
  tpCount: number;
  createdAt: string;
};

export type ResolutionRow = {
  id: string;
  email: string;
  matricule: string;
  matiere: string;
  note: number;
  status: boolean;
  submittedAt: string;
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractArray(payload: unknown, preferredKeys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];
  for (const key of preferredKeys) {
    const v = root[key];
    if (Array.isArray(v)) return v;
  }
  const dataObj = pickObject(root.data);
  if (dataObj) {
    for (const key of preferredKeys) {
      const v = dataObj[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

function extractId(payload: unknown): string {
  if (Array.isArray(payload)) return "";
  const root = pickObject(payload);
  if (!root) return "";
  const direct = String(root._id ?? root.id ?? "").trim();
  if (direct) return direct;
  for (const key of ["data", "activite", "resolution", "result", "payload"]) {
    const nested = pickObject(root[key]);
    if (!nested) continue;
    const id = String(nested._id ?? nested.id ?? "").trim();
    if (id) return id;
  }
  return "";
}

function parseDateIso(raw: unknown): string {
  if (!raw) return "";
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function normalizeCategorie(raw: unknown): ActiviteCategorie | null {
  const v = String(raw ?? "").trim().toUpperCase();
  if (v === "TP" || v === "QCM") return v;
  return null;
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

function extractAnneeLabel(row: Record<string, unknown>): string {
  const annee = row.annee;
  if (annee && typeof annee === "object" && !Array.isArray(annee)) {
    const o = annee as Record<string, unknown>;
    const slug = String(o.slug ?? "").trim();
    if (slug) return slug;
    const des = String(o.designation ?? "").trim();
    if (des) return des;
  }
  if (typeof annee === "string" && annee.trim()) return annee.trim();
  return "";
}

async function listAllowedChargeIds(auth: { matricule: string; email: string }): Promise<Set<string>> {
  const res = await titulaireFetchChargesAll({
    titulaire_matricule: auth.matricule || undefined,
    titulaire_email: auth.email || undefined,
  });
  if (!res.ok) throw new Error(`Service charges indisponible (${res.status})`);
  const ids = new Set<string>();
  for (const row of res.items as Array<Record<string, unknown>>) {
    const id = String(row._id ?? row.id ?? "").trim();
    if (id) ids.add(id);
  }
  return ids;
}

export async function loadTitulaireActivitesPageData(): Promise<{ chargeTabs: ChargeActiviteTab[] }> {
  const auth = await assertTitulaire();
  const res = await titulaireFetchChargesAll({
    titulaire_matricule: auth.matricule || undefined,
    titulaire_email: auth.email || undefined,
  });
  if (!res.ok) throw new Error(`Service charges indisponible (${res.status})`);

  const rawTabs: ChargeActiviteTab[] = [];
  for (const row of res.items as Array<Record<string, unknown>>) {
    const matiere = (row.matiere ?? {}) as Record<string, unknown>;
    const promotion = (row.promotion ?? {}) as Record<string, unknown>;
    const id = String(row._id ?? row.id ?? "").trim();
    const programmeRef = String(promotion.reference ?? "").trim();
    if (!id || !programmeRef || !Types.ObjectId.isValid(programmeRef)) continue;

    const prog = await ProgrammeModel.findById(new Types.ObjectId(programmeRef))
      .select("designation")
      .lean();
    const mat = String(matiere.designation ?? "Cours").trim();
    const programmeDesignation = String(prog?.designation ?? promotion.designation ?? "Promotion");
    rawTabs.push({
      id,
      label: "",
      matiereDesignation: mat,
      programmeDesignation,
      anneeLabel: extractAnneeLabel(row),
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

  return { chargeTabs };
}

async function fetchArrayFromCandidatePaths(paths: string[], emptyError: string): Promise<unknown[]> {
  let lastError = "";
  for (const path of paths) {
    const res = await fetchTitulaireService(path, { method: "GET" });
    if (!res.ok) {
      const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
      lastError = String(payload.message ?? payload.error ?? `HTTP ${res.status}`);
      continue;
    }
    const payload = await res.json().catch(() => ({}));
    const rows = extractArray(payload, ["data", "items", "rows", "list", "activites", "resolutions"]);
    if (rows.length > 0 || Array.isArray(payload)) return rows;
  }
  if (lastError) throw new Error(lastError);
  throw new Error(emptyError);
}

export async function listActivitesForCharge(
  chargeId: string,
  categorie?: ActiviteCategorie
): Promise<ActiviteListItem[]> {
  const auth = await assertTitulaire();
  const id = String(chargeId ?? "").trim();
  if (!id) return [];

  const allowed = await listAllowedChargeIds(auth);
  if (!allowed.has(id)) return [];

  const rows = await fetchArrayFromCandidatePaths(
    [
      `/activites/charge/${encodeURIComponent(id)}`,
      `/activites/all?charge_horaire=${encodeURIComponent(id)}`,
      `/activites/all?chargeId=${encodeURIComponent(id)}`,
      "/activites/all",
    ],
    "Impossible de charger les activités."
  );

  const mapped = rows
    .map((raw) => {
      const x = (raw ?? {}) as Record<string, unknown>;
      const nestedCharge = pickObject(x.charge_horaire);
      const chargeRef = String(nestedCharge?._id ?? nestedCharge?.id ?? x.charge_horaire ?? "").trim();
      const cat = normalizeCategorie(x.categorie);
      if (!cat) return null;
      return {
        id: String(x._id ?? x.id ?? "").trim(),
        chargeId: chargeRef,
        categorie: cat,
        dateRemise: parseDateIso(x.date_remise),
        status: String(x.status ?? "").trim(),
        noteMaximale: Number(x.note_maximale ?? 0),
        montant: Number(x.montant ?? 0),
        currency: String(x.currency ?? "").trim(),
        qcmCount: Array.isArray(x.qcm) ? x.qcm.length : 0,
        tpCount: Array.isArray(x.tp) ? x.tp.length : 0,
        createdAt: parseDateIso(x.createdAt),
      } satisfies ActiviteListItem;
    })
    .filter((x): x is ActiviteListItem => Boolean(x?.id));

  return mapped.filter((a) => a.chargeId === id && (!categorie || a.categorie === categorie));
}

export async function createTitulaireActivite(input: {
  chargeId: string;
  categorie: ActiviteCategorie;
  date_remise?: string;
  status?: string;
  note_maximale: number;
  montant?: number;
  currency?: string;
  qcm?: Array<{ enonce: string; options: string[]; reponse: string }>;
  tp?: Array<{ enonce: string; description: Array<{ title: string; contenu: string[] }>; fichiers: string[]; status: boolean }>;
}): Promise<{ ok: true; id: string } | { ok: false; message: string }> {
  const auth = await assertTitulaire();
  const chargeId = String(input.chargeId ?? "").trim();
  if (!chargeId) return { ok: false, message: "Charge invalide." };

  const allowed = await listAllowedChargeIds(auth);
  if (!allowed.has(chargeId)) return { ok: false, message: "Cette charge ne vous appartient pas." };

  const payload = {
    charge_horaire: chargeId,
    categorie: input.categorie,
    date_remise: input.date_remise ? String(input.date_remise).trim() : undefined,
    status: String(input.status ?? "active").trim(),
    note_maximale: Number(input.note_maximale ?? 0),
    montant: Number(input.montant ?? 0),
    currency: String(input.currency ?? "USD").trim(),
    qcm: Array.isArray(input.qcm) ? input.qcm : [],
    tp: Array.isArray(input.tp) ? input.tp : [],
  };

  const res = await fetchTitulaireService("/activites/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = pickObject(body);
    return { ok: false, message: String(err?.message ?? err?.error ?? "Création d'activité impossible.") };
  }
  const id = extractId(body);
  if (!id) return { ok: false, message: "Activité créée mais identifiant introuvable." };
  return { ok: true, id };
}

export async function listResolutionsForActivite(activiteId: string): Promise<ResolutionRow[]> {
  await assertTitulaire();
  const id = String(activiteId ?? "").trim();
  if (!id) return [];

  const rows = await fetchArrayFromCandidatePaths(
    [
      `/resolutions/activite/${encodeURIComponent(id)}`,
      `/resolutions/all?activite_id=${encodeURIComponent(id)}`,
      "/resolutions/all",
    ],
    "Impossible de charger les résolutions."
  );

  return rows
    .map((raw) => {
      const x = (raw ?? {}) as Record<string, unknown>;
      const nestedActivite = pickObject(x.activite_id);
      const activiteRef = String(nestedActivite?._id ?? nestedActivite?.id ?? x.activite_id ?? "").trim();
      if (activiteRef !== id) return null;
      return {
        id: String(x._id ?? x.id ?? "").trim(),
        email: String(x.email ?? "").trim(),
        matricule: String(x.matricule ?? "").trim(),
        matiere: String(x.matiere ?? "").trim(),
        note: Number(x.note ?? 0),
        status: Boolean(x.status),
        submittedAt: parseDateIso(x.updatedAt ?? x.createdAt),
      } satisfies ResolutionRow;
    })
    .filter((x): x is ResolutionRow => Boolean(x?.id));
}
