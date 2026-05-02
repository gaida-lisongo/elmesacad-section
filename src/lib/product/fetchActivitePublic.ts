import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractActivite(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) return null;
  const root = pickObject(payload);
  if (!root) return null;
  if (root._id || root.id) return root;
  for (const key of ["data", "activite", "result", "payload"]) {
    const nested = pickObject(root[key]);
    if (nested && (nested._id || nested.id)) return nested;
  }
  return null;
}

/**
 * Charge une activité publiquement (mêmes endpoints que `GET /api/activites/[id]`, sans passer par la route HTTP).
 */
export async function fetchActivitePublic(activiteId: string): Promise<Record<string, unknown> | null> {
  const base = getTitulaireServiceBase();
  if (!base) return null;

  const candidates = [
    `/activites/${encodeURIComponent(activiteId)}`,
    `/activites/get/${encodeURIComponent(activiteId)}`,
    `/activites/by-id/${encodeURIComponent(activiteId)}`,
    `/activites/all`,
  ];

  for (const path of candidates) {
    const upstream = await fetch(`${base}${path}`, { method: "GET", cache: "no-store" });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) continue;

    if (path !== "/activites/all") {
      const activity = extractActivite(body);
      if (activity) return activity;
      continue;
    }

    const list = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data?: unknown[] }).data ?? [])
        : [];
    const found = list.find((x) => {
      const o = pickObject(x);
      return String(o?._id ?? o?.id ?? "").trim() === activiteId;
    });
    if (found) return pickObject(found) ?? null;
  }

  return null;
}
