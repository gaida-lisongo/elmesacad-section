/**
 * URLs et en-têtes du microservice mail (account-service).
 *
 * - X-API-Key : ACCOUNT_API_KEY (ou variantes par audience) — **pas** GLOBAL_SHARED_KEY.
 * - Authorization Bearer : via getServiceJwt() (Traefik) ou surcharge env ci-dessous.
 * - Schéma Dovecot : MAIL_ACCOUNT_PASSWORD_SCHEME (ex. MD5-CRYPT, PLAIN-MD5) — voir resolveMailAccountPasswordScheme().
 */
export type MailServiceAudience = "admin" | "agent" | "student";

export function resolveMailServiceBaseUrl(audience: MailServiceAudience): string | null {
  const raw =
    audience === "admin"
      ? process.env.ACCOUNT_SERVICE_ADMIN?.trim() || process.env.ACCOUNT_SERVICE?.trim()
      : audience === "agent"
        ? process.env.ACCOUNT_SERVICE_AGENT?.trim() || process.env.ACCOUNT_SERVICE?.trim()
        : process.env.ACCOUNT_SERVICE_STUDENT?.trim() || process.env.ACCOUNT_SERVICE?.trim();

  return raw ? raw.replace(/\/+$/, "") : null;
}

/** True si la valeur ressemble à un JWT (souvent confondu avec la clé X-API-Key statique). */
export function looksLikeJwt(value: string): boolean {
  const t = value.trim();
  return t.startsWith("eyJ") && t.includes(".") && t.split(".").length >= 2;
}

/**
 * Schéma mot de passe attendu par Dovecot côté stockage (passdb).
 * Ex. `MD5-CRYPT` ou `PLAIN-MD5` si default_pass_scheme / compat impose ces formats.
 * Envoyé dans le JSON mail-accounts comme `passwordScheme` — **l’account-service doit hacher
 * le mot de passe en clair** selon ce schéma avant INSERT/UPDATE SQL.
 */
export function resolveMailAccountPasswordScheme(): string | undefined {
  return (
    process.env.MAIL_ACCOUNT_PASSWORD_SCHEME?.trim() ||
    process.env.DOVECOT_PASSWORD_SCHEME?.trim() ||
    undefined
  );
}

/** Clé métier account-service (X-API-Key), distincte du GLOBAL_SHARED_KEY (HMAC auth). */
export function resolveMailXApiKey(audience: MailServiceAudience): string | undefined {
  const specific =
    audience === "admin"
      ? process.env.ACCOUNT_API_KEY_ADMIN?.trim()
      : audience === "agent"
        ? process.env.ACCOUNT_API_KEY_AGENT?.trim()
        : process.env.ACCOUNT_API_KEY_STUDENT?.trim();

  return (
    specific ||
    process.env.ACCOUNT_API_KEY?.trim() ||
    process.env.ACCOUNT_SERVICE_API_KEY?.trim() ||
    undefined
  );
}

/** Surcharge optionnelle du Bearer (sinon getServiceJwt() côté client mail). */
export function resolveMailBearerOverride(audience: MailServiceAudience): string | undefined {
  const specific =
    audience === "admin"
      ? process.env.ACCOUNT_SERVICE_JWT_ADMIN?.trim()
      : audience === "agent"
        ? process.env.ACCOUNT_SERVICE_JWT_AGENT?.trim()
        : process.env.ACCOUNT_SERVICE_JWT_STUDENT?.trim();

  return specific || undefined;
}
