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

export function extractTransactionStatusFromCheckResponse(
  check: PaymentResponse
): string | null {
  return findProviderTransaction(check)?.status ?? null;
}

/**
 * 0 = payé, 2 = en attente, autre = échec côté dépôt.
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
  return "failed";
}
