import { fetchTitulaireService } from "@/lib/service-auth/upstreamFetch";
import type { StructuredNotesEntry } from "@/lib/notes/consolidatedResultTypes";

/**
 * Appels titulaire `GET /notes/student/:matricule`.
 */
export async function fetchStructuredNotesTitulaireForMatricules(
  matricules: string[]
): Promise<Record<string, StructuredNotesEntry>> {
  const clean = (Array.isArray(matricules) ? matricules : [])
    .map((m) => String(m ?? "").trim())
    .filter(Boolean);
  const unique = [...new Set(clean)];
  const result: Record<string, StructuredNotesEntry> = {};
  for (const matricule of unique) {
    const res = await fetchTitulaireService(`/notes/student/${encodeURIComponent(matricule)}`, {
      method: "GET",
    });
    const payload = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
    result[matricule] = {
      ok: res.ok,
      status: res.status,
      data: res.ok ? (payload.data ?? payload) : null,
      message: payload.message,
    };
  }
  return result;
}
