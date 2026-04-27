import { decodeJwt } from "jose";
import { computeAuthAdminSignature } from "./hmac";
import {
  getAuthClientCredentials,
  getAuthServiceBaseUrl,
  getGlobalSharedKeyForHmac,
  getStaticServicesBearerJwt,
} from "./config";

type Cache = {
  token: string;
  expiresAtMs: number;
};

let cache: Cache | null = null;
let inflight: Promise<string | null> | null = null;

const SKEW_MS = 120_000;

function decodeExpMs(token: string): number | null {
  try {
    const { exp } = decodeJwt(token);
    if (typeof exp !== "number") {
      return null;
    }
    return exp * 1000;
  } catch {
    return null;
  }
}

function cacheFromToken(token: string, fallbackDurationSec: number): Cache {
  let expiresAtMs = decodeExpMs(token);
  if (expiresAtMs == null || !Number.isFinite(expiresAtMs)) {
    expiresAtMs = Date.now() + Math.max(fallbackDurationSec, 60) * 1000;
  }
  return { token, expiresAtMs };
}

type ProvisionOutcome =
  | { kind: "created"; token: string; expiresAtMs: number }
  | { kind: "duplicate" }
  | { kind: "error"; status: number; detail: string };

/**
 * POST /api/v1/client/provision — crée le client applicatif + premier JWT (HMAC).
 */
async function provisionJwtFromAuthService(): Promise<ProvisionOutcome> {
  const base = getAuthServiceBaseUrl();
  const shared = getGlobalSharedKeyForHmac();
  const creds = getAuthClientCredentials();
  if (!base || !shared || !creds) {
    return { kind: "error", status: 0, detail: "config manquante" };
  }

  const designation =
    process.env.AUTH_CLIENT_DESIGNATION?.trim() || "Application Next.js INBTP";
  const durationRaw = process.env.AUTH_CLIENT_TOKEN_DURATION_SECONDS?.trim();
  const duration = durationRaw ? parseInt(durationRaw, 10) : 3600;
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 3600;

  const timestamp = Date.now().toString();
  const signature = await computeAuthAdminSignature(shared, timestamp, creds.apiKey);

  const res = await fetch(`${base}/api/v1/client/provision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      designation,
      duration: safeDuration,
      timestamp,
      signature,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    token?: string;
    message?: string;
    error?: string;
  } | null;

  if (res.status === 201 && data?.token) {
    const c = cacheFromToken(data.token, safeDuration);
    return { kind: "created", token: c.token, expiresAtMs: c.expiresAtMs };
  }

  if (res.status === 400) {
    const err = (data?.error ?? "").toLowerCase();
    if (
      err.includes("déjà") ||
      err.includes("deja") ||
      err.includes("existe") ||
      err.includes("already") ||
      err.includes("registered") ||
      err.includes("enregistré") ||
      err.includes("enregistre")
    ) {
      return { kind: "duplicate" };
    }
  }

  const detail = data?.error ?? `HTTP ${res.status}`;
  if (res.status !== 400) {
    console.warn("[service-auth] provision:", detail);
  }
  return { kind: "error", status: res.status, detail };
}

async function refreshJwtFromAuthService(): Promise<{ token: string; expiresAtMs: number } | null> {
  const base = getAuthServiceBaseUrl();
  const shared = getGlobalSharedKeyForHmac();
  const creds = getAuthClientCredentials();
  if (!base || !shared || !creds) {
    return null;
  }

  const timestamp = Date.now().toString();
  const signature = await computeAuthAdminSignature(shared, timestamp, creds.apiKey);

  const res = await fetch(`${base}/api/v1/client/refresh`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: creds.apiKey,
      apiSecret: creds.apiSecret,
      timestamp,
      signature,
    }),
    cache: "no-store",
  });

  const data = (await res.json().catch(() => null)) as {
    token?: string;
    expiresAt?: string;
    error?: string;
  } | null;

  if (!res.ok || !data?.token) {
    const msg = data?.error ?? `refresh HTTP ${res.status}`;
    console.error("[service-auth] refresh échoué:", msg);
    return null;
  }

  let expiresAtMs = decodeExpMs(data.token);
  if (expiresAtMs == null && data.expiresAt) {
    expiresAtMs = Date.parse(data.expiresAt);
  }
  if (expiresAtMs == null || !Number.isFinite(expiresAtMs)) {
    expiresAtMs = Date.now() + 3_500_000;
  }

  return { token: data.token, expiresAtMs };
}

/**
 * Au montage : provision (création client + JWT) puis, si client déjà connu, refresh.
 */
export async function prefetchServiceJwt(): Promise<boolean> {
  const base = getAuthServiceBaseUrl();
  const shared = getGlobalSharedKeyForHmac();
  const creds = getAuthClientCredentials();
  if (!base || !shared || !creds) {
    console.warn(
      "[service-auth] Préchargement JWT ignoré : définissez AUTH_SERVICE_BASE_URL, GLOBAL_SHARED_KEY (ou AUTH_GLOBAL_SHARED_KEY), AUTH_CLIENT_API_KEY et AUTH_CLIENT_API_SECRET"
    );
    return false;
  }

  const prov = await provisionJwtFromAuthService();
  if (prov.kind === "created") {
    cache = { token: prov.token, expiresAtMs: prov.expiresAtMs };
    console.info(
      `[service-auth] JWT issu du provisionnement (expire ~ ${new Date(prov.expiresAtMs).toISOString()})`
    );
    return true;
  }

  if (prov.kind === "duplicate") {
    console.info("[service-auth] Client déjà enregistré — rafraîchissement du JWT…");
  }

  const refreshed = await refreshJwtFromAuthService();
  if (refreshed) {
    cache = { token: refreshed.token, expiresAtMs: refreshed.expiresAtMs };
    console.info(
      `[service-auth] JWT préchargé via refresh (expire ~ ${new Date(refreshed.expiresAtMs).toISOString()})`
    );
    return true;
  }

  console.warn(
    "[service-auth] Préchargement JWT échoué — nouvelle tentative à la première requête métier"
  );
  return false;
}

/**
 * JWT pour appels métier derrière Traefik : mail, titulaire, étudiant.
 * Ordre : cache → jeton statique → refresh → provision (si besoin) → refresh.
 */
export async function getServiceJwt(): Promise<string | null> {
  const now = Date.now();

  if (cache && cache.expiresAtMs - SKEW_MS > now) {
    return cache.token;
  }

  const staticJwt = getStaticServicesBearerJwt();
  if (staticJwt) {
    const exp = decodeExpMs(staticJwt);
    if (exp != null && exp - SKEW_MS > now) {
      cache = { token: staticJwt, expiresAtMs: exp };
      return staticJwt;
    }
    if (exp == null) {
      return staticJwt;
    }
  }

  if (inflight) {
    return inflight;
  }

  inflight = (async (): Promise<string | null> => {
    let refreshed = await refreshJwtFromAuthService();
    if (refreshed) {
      cache = { token: refreshed.token, expiresAtMs: refreshed.expiresAtMs };
      return refreshed.token;
    }

    const prov = await provisionJwtFromAuthService();
    if (prov.kind === "created") {
      cache = { token: prov.token, expiresAtMs: prov.expiresAtMs };
      return prov.token;
    }

    if (prov.kind === "duplicate") {
      refreshed = await refreshJwtFromAuthService();
      if (refreshed) {
        cache = { token: refreshed.token, expiresAtMs: refreshed.expiresAtMs };
        return refreshed.token;
      }
    }

    return null;
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export function clearServiceJwtCache(): void {
  cache = null;
}
