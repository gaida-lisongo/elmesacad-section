import { getServiceJwt } from "./getServiceJwt";

function normalizeBase(envVal: string | undefined): string | null {
  const u = envVal?.trim();
  return u ? u.replace(/\/+$/, "") : null;
}

export function getTitulaireServiceBase(): string | null {
  return normalizeBase(process.env.TITULAIRE_SERVICE);
}

export function getEtudiantServiceBase(): string | null {
  return normalizeBase(process.env.ETUDIANT_SERVICE);
}

export function getMailServiceBase(): string | null {
  return normalizeBase(process.env.ACCOUNT_SERVICE);
}

function mergeHeaders(
  init: RequestInit | undefined,
  extra: Record<string, string>
): Headers {
  const h = new Headers(init?.headers);
  for (const [k, v] of Object.entries(extra)) {
    if (v) {
      h.set(k, v);
    }
  }
  return h;
}

/**
 * GET/POST/etc. vers le service titulaire (Traefik) avec Authorization: Bearer.
 */
export async function fetchTitulaireService(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getTitulaireServiceBase();
  if (!base) {
    throw new Error("TITULAIRE_SERVICE manquant dans l’environnement");
  }
  const jwt = await getServiceJwt();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: mergeHeaders(init, {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    }),
  });
}

/**
 * Idem pour le service étudiant.
 */
export async function fetchEtudiantService(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getEtudiantServiceBase();
  if (!base) {
    throw new Error("ETUDIANT_SERVICE manquant dans l’environnement");
  }
  const jwt = await getServiceJwt();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers: mergeHeaders(init, {
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
    }),
  });
}
