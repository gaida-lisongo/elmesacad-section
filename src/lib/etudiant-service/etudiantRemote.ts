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

export async function fetchEtudiantApi(path: string, init?: RequestInit): Promise<Response> {
  return fetchEtudiantService(path, init);
}

