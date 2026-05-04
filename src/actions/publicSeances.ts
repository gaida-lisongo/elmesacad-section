"use server";

import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";

type PublicSeanceRaw = Record<string, unknown>;

export type PublicSeanceCard = {
  id: string;
  chargeId: string;
  title: string;
  dateSeance: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
  matiere: string;
  promotion: string;
  status: boolean;
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractArray(payload: unknown, keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];

  for (const key of keys) {
    const value = root[key];
    if (Array.isArray(value)) return value;
  }

  const nested = pickObject(root.data);
  if (!nested) return [];
  for (const key of keys) {
    const value = nested[key];
    if (Array.isArray(value)) return value;
  }

  return [];
}

function toIsoDate(raw: unknown): string {
  if (!raw) return "";
  const d = new Date(String(raw));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function mapSeance(raw: unknown): PublicSeanceCard | null {
  const x = pickObject(raw) as PublicSeanceRaw | null;
  if (!x) return null;

  const id = String(x._id ?? x.id ?? "").trim();
  if (!id) return null;

  const charge = pickObject(x.charge_horaire);
  const chargeId = String(charge?._id ?? charge?.id ?? x.charge_horaire ?? "").trim();
  const matiere = pickObject(charge?.matiere);
  const promotion = pickObject(charge?.promotion);

  return {
    id,
    chargeId,
    title: String(x.lecon ?? "").trim() || "Seance",
    dateSeance: toIsoDate(x.date),
    jour: String(x.jour ?? "").trim(),
    heureDebut: String(x.heure_debut ?? x.heureDebut ?? "").trim(),
    heureFin: String(x.heure_fin ?? x.heureFin ?? "").trim(),
    salle: String(x.salle ?? "").trim() || "Salle non definie",
    matiere: String(matiere?.designation ?? "").trim() || "Matiere non precisee",
    promotion: String(promotion?.designation ?? "").trim() || "Promotion non precisee",
    status: Boolean(x.status),
  };
}

export async function listRecentSeancesPublic(limit = 6): Promise<PublicSeanceCard[]> {
  const base = getTitulaireServiceBase();
  if (!base) return [];

  const safeLimit = Math.min(Math.max(1, limit), 24);
  const url = `${base}/seances/all?page=1&limit=${safeLimit}`;

  try {
    const res = await fetch(url, { method: "GET", cache: "no-store" });
    if (!res.ok) return [];

    const payload = await res.json().catch(() => []);
    const rows = extractArray(payload, ["data", "items", "rows", "list", "seances"]);

    return rows
      .map((raw) => mapSeance(raw))
      .filter((item): item is PublicSeanceCard => Boolean(item?.id))
      .slice(0, safeLimit);
  } catch {
    return [];
  }
}
