/**
 * Exécuté une fois au démarrage du serveur Node (hors Edge).
 * Précharge le JWT métier (auth-service : HMAC + refresh) pour mail / titulaire / étudiant.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  if (process.env.NODE_ENV === "production" && !process.env.MONGODB_URI?.trim()) {
    console.error(
      "[instrumentation] MONGODB_URI est absent : les routes MongoDB échoueront. En Docker, passez l’URI (ex. mongodb://mongo:27017/…), pas localhost vu depuis le conteneur."
    );
  }

  try {
    const { prefetchServiceJwt } = await import("@/lib/service-auth/getServiceJwt");
    await prefetchServiceJwt();
  } catch (e) {
    console.error("[instrumentation] prefetchServiceJwt:", e);
  }
}
