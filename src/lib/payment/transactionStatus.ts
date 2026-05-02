import type { PaymentResponse } from "@/lib/services/PaymentService";

/**
 * Repère le premier objet { transaction: { status } } dans la charge utile (structure FlexPay imbriguée en data / data / …).
 */
export function findProviderTransaction(
  value: unknown
): { status: string } | null {
  if (value == null || typeof value !== "object") {
    return null;
  }
  const o = value as Record<string, unknown>;
  if (o.transaction != null && typeof o.transaction === "object") {
    const t = o.transaction as Record<string, unknown>;
    if (t.status !== undefined && t.status !== null) {
      return { status: String(t.status) };
    }
  }
  for (const v of Object.values(o)) {
    if (v != null && typeof v === "object") {
      const found = findProviderTransaction(v);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Extrait l’identifiant à passer à `GET /check?orderNumber=` après un collect FlexPay.
 * Souvent `transaction.reference` plutôt que `orderNumber` dans la réponse réelle.
 */
export function extractFlexPayOrderKeyFromPayload(value: unknown): string | undefined {
  if (value == null || typeof value !== "object") return undefined;
  const o = value as Record<string, unknown>;
  if (o.transaction != null && typeof o.transaction === "object") {
    const t = o.transaction as Record<string, unknown>;
    const on = String(t.orderNumber ?? "").trim();
    const ref = String(t.reference ?? "").trim();
    if (on) return on;
    if (ref) return ref;
  }
  /** Collect « push » : `orderNumber` est souvent dans `data.data`, sans objet `transaction`. */
  const directOn = String(o.orderNumber ?? "").trim();
  const directRef = String(o.reference ?? "").trim();
  if (directOn) return directOn;
  if (directRef) return directRef;
  for (const v of Object.values(o)) {
    if (v != null && typeof v === "object") {
      const found = extractFlexPayOrderKeyFromPayload(v);
      if (found) return found;
    }
  }
  return undefined;
}

export function extractTransactionStatusFromCheckResponse(
  check: PaymentResponse
): string | null {
  return findProviderTransaction(check)?.status ?? findProviderTransaction(check.data)?.status ?? null;
}

/** Intégration : hors prod, ou si PAYMENT_RELAX_FLEXPAY_STATUS=true, traiter l’échec explicite (status 1) comme payé. */
export function flexpayRelaxDeclinedAsPaid(): boolean {
  if (process.env.PAYMENT_STRICT_FLEXPAY === "true") return false;
  if (process.env.PAYMENT_RELAX_FLEXPAY_STATUS === "true") return true;
  return process.env.NODE_ENV !== "production";
}

/**
 * FlexPay `transaction.status` (chaîne) : "0" payé, "2" attente, "1" échec annoncé.
 * Équipe : en développement, "1" compte comme payé pour enchaîner le métier (microservice, etc.).
 */
export function mapProviderTransactionToDeposit(
  status: string
): "pending" | "paid" | "failed" {
  const s = String(status).trim();
  if (s === "0") {
    return "paid";
  }
  if (s === "2") {
    return "pending";
  }
  if (s === "1") {
    return flexpayRelaxDeclinedAsPaid() ? "paid" : "failed";
  }
  if (flexpayRelaxDeclinedAsPaid()) {
    return "paid";
  }
  return "failed";
}
