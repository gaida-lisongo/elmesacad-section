/**
 * Exécuté une fois au démarrage du serveur Node (hors Edge).
 * Précharge le JWT métier (auth-service : HMAC + refresh) pour mail / titulaire / étudiant.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    const { prefetchServiceJwt } = await import("@/lib/service-auth/getServiceJwt");
    await prefetchServiceJwt();
  } catch (e) {
    console.error("[instrumentation] prefetchServiceJwt:", e);
  }
}
