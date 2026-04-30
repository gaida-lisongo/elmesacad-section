"use server";

import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";

type PublicHeroActivity = {
  id: string;
  title: string;
  summary: string;
  teacher: string;
  badge: string;
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function toIso(raw: unknown): string {
  const d = new Date(String(raw ?? ""));
  return Number.isNaN(d.getTime()) ? "" : d.toISOString();
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];
  if (Array.isArray(root.data)) return root.data;
  if (Array.isArray(root.items)) return root.items;
  return [];
}

function mapOne(raw: unknown): PublicHeroActivity | null {
  const row = pickObject(raw);
  if (!row) return null;

  const id = String(row._id ?? row.id ?? "").trim();
  if (!id) return null;

  const categorie = String(row.categorie ?? "").trim().toUpperCase();
  const tp = Array.isArray(row.tp) ? row.tp : [];
  const qcm = Array.isArray(row.qcm) ? row.qcm : [];
  const firstTp = pickObject(tp[0]);
  const firstQcm = pickObject(qcm[0]);

  const title =
    String(firstTp?.enonce ?? firstQcm?.enonce ?? "").trim() ||
    `${categorie || "ACTIVITE"} ${id.slice(-6)}`;

  const summary = `Categorie ${categorie || "N/A"} · Note max ${Number(row.note_maximale ?? 0)} · ${
    String(row.status ?? "active").trim() || "active"
  }`;

  return {
    id,
    title,
    summary,
    teacher: "Publication enseignant",
    badge: categorie || "Activite",
  };
}

export async function loadPublicHeroActivities(): Promise<PublicHeroActivity[]> {
  const base = getTitulaireServiceBase();
  if (!base) return [];

  try {
    const res = await fetch(`${base}/activites/all`, { method: "GET", cache: "no-store" });
    if (!res.ok) return [];
    const payload = await res.json().catch(() => []);
    const rows = extractRows(payload);

    const mapped = rows
      .map((x) => ({
        item: mapOne(x),
        createdAt: toIso(pickObject(x)?.createdAt),
      }))
      .filter((x): x is { item: PublicHeroActivity; createdAt: string } => Boolean(x.item))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 6)
      .map((x) => x.item);

    return mapped;
  } catch {
    return [];
  }
}

export type { PublicHeroActivity };
