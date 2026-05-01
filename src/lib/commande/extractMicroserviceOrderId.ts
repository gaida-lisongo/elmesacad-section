function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

/**
 * Extrait un identifiant de commande / ordre depuis une réponse microservice (formes courantes).
 */
export function extractMicroserviceOrderId(payload: unknown): string | undefined {
  if (payload == null) return undefined;
  if (typeof payload === "string") {
    const s = payload.trim();
    return s || undefined;
  }
  if (!isRecord(payload)) return undefined;

  const tryKeys = (o: Record<string, unknown>): string | undefined => {
    const keys = ["_id", "id", "orderId", "order_id", "commandeId", "commande_id", "numero", "reference"];
    for (const k of keys) {
      const v = o[k];
      if (v != null && typeof v !== "object") {
        const s = String(v).trim();
        if (s) return s;
      }
    }
    return undefined;
  };

  const direct = tryKeys(payload);
  if (direct) return direct;

  const data = payload.data;
  if (isRecord(data)) {
    const fromData = tryKeys(data);
    if (fromData) return fromData;
  }

  const commande = payload.commande;
  if (isRecord(commande)) {
    const fromCmd = tryKeys(commande);
    if (fromCmd) return fromCmd;
  }

  return undefined;
}
