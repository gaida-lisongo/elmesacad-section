/**
 * Variables d’environnement — alignement monorepo / Traefik
 *
 * - AUTH_SERVICE_BASE_URL : URL du conteneur auth (ex. https://services.inbtp.ac.cd/auth ou http://auth:3000)
 * - GLOBAL_SHARED_KEY ou AUTH_GLOBAL_SHARED_KEY : clé HMAC (provision / refresh / …)
 * - AUTH_CLIENT_API_KEY + AUTH_CLIENT_API_SECRET : client applicatif Next.js
 * - AUTH_CLIENT_DESIGNATION : libellé pour POST /client/provision (défaut : Next.js INBTP)
 * - AUTH_CLIENT_TOKEN_DURATION_SECONDS : durée JWT en secondes (défaut : 3600)
 *
 * Court-circuit (sans appel auth) :
 * - SERVICES_BEARER_JWT : JWT statique (expire → à renouveler à la main)
 *
 * Mail (account-service) : ACCOUNT_API_KEY en X-API-Key (ne pas utiliser GLOBAL_SHARED_KEY comme X-API-Key).
 */

export function getAuthServiceBaseUrl(): string | null {
  const u =
    process.env.AUTH_SERVICE_BASE_URL?.trim() ||
    process.env.AUTH_SERVICE_URL?.trim();
  return u ? u.replace(/\/+$/, "") : null;
}

export function getGlobalSharedKeyForHmac(): string | undefined {
  return (
    process.env.AUTH_GLOBAL_SHARED_KEY?.trim() ||
    process.env.GLOBAL_SHARED_KEY?.trim() ||
    undefined
  );
}

export function getAuthClientCredentials(): { apiKey: string; apiSecret: string } | null {
  const apiKey = process.env.AUTH_CLIENT_API_KEY?.trim();
  const apiSecret = process.env.AUTH_CLIENT_API_SECRET?.trim();
  if (!apiKey || !apiSecret) {
    return null;
  }
  return { apiKey, apiSecret };
}

/** JWT imposé manuellement (doit ressembler à un JWT). */
export function getStaticServicesBearerJwt(): string | undefined {
  const raw =
    process.env.SERVICES_BEARER_JWT?.trim() ||
    process.env.ACCOUNT_SERVICE_JWT?.trim();
  if (!raw) {
    return undefined;
  }
  if (raw.startsWith("eyJ")) {
    return raw;
  }
  return undefined;
}
