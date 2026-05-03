import {
  fetchEtudiantService,
  getEtudiantServiceBase,
} from "@/lib/service-auth/upstreamFetch";

export function etudiantServiceUrl(path: string): string {
  const base = getEtudiantServiceBase();
  if (!base) {
    throw new Error("ETUDIANT_SERVICE manquant dans l’environnement");
  }
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Exposé pour logs / diagnostics (même règle que `fetchEtudiantApi`). */
export function normalizeEtudiantPath(input: string): string {
  let p = String(input ?? "").trim();
  if (!p) return "/";

  // Si on reçoit une URL absolue par erreur, on garde seulement pathname + search.
  if (/^https?:\/\//i.test(p)) {
    try {
      const u = new URL(p);
      p = `${u.pathname}${u.search}`;
    } catch {
      // fallback: on garde la chaîne telle quelle puis normalisation ci-dessous
    }
  }

  if (!p.startsWith("/")) p = `/${p}`;
  // Corrige les doubles préfixes fréquents (/api/api/...)
  p = p.replace(/^\/api\/api\//i, "/api/");
  return p;
}

export async function fetchEtudiantApi(path: string, init?: RequestInit): Promise<Response> {
  return fetchEtudiantService(normalizeEtudiantPath(path), init);
}

