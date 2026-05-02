import { getServiceJwt } from "./getServiceJwt";
import { getSessionToken, refreshSessionJwtFromDb } from "@/lib/auth/sessionServer";

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

async function buildAuthHeaders(
  init: RequestInit | undefined,
  bearer?: string
): Promise<Headers> {
  const jwt = bearer ?? (await getSessionToken()) ?? (await getServiceJwt());
  return mergeHeaders(init, {
    ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
  });
}

async function doFetch(url: string, init: RequestInit | undefined, headers: Headers): Promise<Response> {
  return fetch(url, {
    ...init,
    cache: "no-store",
    headers,
  });
}

/**
 * GET/POST/etc. vers le service titulaire (Traefik) avec Authorization: Bearer.
 * Sur 401: tente un refresh session, puis rejoue la requête.
 */
export async function fetchTitulaireService(
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = getTitulaireServiceBase();
  if (!base) {
    throw new Error("TITULAIRE_SERVICE manquant dans l’environnement");
  }

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  
  let res = await doFetch(url, init, await buildAuthHeaders(init));
  if (res.status !== 401) return res;

  const refreshed = await refreshSessionJwtFromDb();
  if (!refreshed) return res;

  res = await doFetch(url, init, await buildAuthHeaders(init, refreshed.token));
  return res;
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

  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  let res = await doFetch(url, init, await buildAuthHeaders(init));
  if (res.status !== 401) return res;

  const refreshed = await refreshSessionJwtFromDb();
  if (!refreshed) return res;

  res = await doFetch(url, init, await buildAuthHeaders(init, refreshed.token));
  return res;
}
