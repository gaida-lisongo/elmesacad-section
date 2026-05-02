import { fetchEtudiantService } from "@/lib/service-auth/upstreamFetch";

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function readJsonPayload(upstream: Response, rawText: string): Record<string, unknown> {
  if (!rawText) return {};
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/**
 * Détail ressource service étudiant (`GET /api/resources/:id`).
 */
export async function fetchEtudiantResourceById(resourceId: string): Promise<Record<string, unknown> | null> {
  const upstream = await fetchEtudiantService(`/resources/${encodeURIComponent(resourceId)}`, {
    method: "GET",
  });
  const rawText = await upstream.text();
  const payload = readJsonPayload(upstream, rawText);
  if (!upstream.ok) return null;
  const data = payload.data ?? payload;
  const row = pickObject(data);
  if (!row || !String(row._id ?? row.id ?? "").trim()) return null;
  return row;
}
