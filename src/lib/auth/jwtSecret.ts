/**
 * JWT HS256 pour le cookie `auth_session` (OTP agent / étudiant).
 * Préférer AUTH_JWT_SECRET dédié en prod ; sinon repli sur NEXTAUTH_SECRET (déjà requis par NextAuth).
 */
export function resolveAuthSessionSecret(): string {
  const secret =
    process.env.AUTH_JWT_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  if (secret.length < 16) {
    throw new Error(
      "AUTH_JWT_SECRET or NEXTAUTH_SECRET is missing or too short (min 16 chars)."
    );
  }
  return secret;
}

/** Pour le middleware : pas d’exception, redirection si config invalide. */
export function tryAuthSessionSecret(): string | null {
  const secret =
    process.env.AUTH_JWT_SECRET?.trim() || process.env.NEXTAUTH_SECRET?.trim() || "";
  return secret.length >= 16 ? secret : null;
}
