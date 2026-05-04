import { PaymentService, type CollectPayload, type PaymentResponse } from "@/lib/services/PaymentService";

/**
 * Même appel que POST /api/payment/collect — journalisation unique pour le debug.
 * À lire côté serveur pour identifier le champ orderNumber, statut, etc.
 */
function maskPhoneForLog(phone: string): string {
  const d = String(phone ?? "").replace(/\D/g, "");
  if (d.length < 4) return "(trop court)";
  return `***${d.slice(-4)}`;
}

export async function runCollectWithLogging(
  payload: CollectPayload
): Promise<PaymentResponse> {
  const payUrl = process.env.PAYMENT_SERVICE?.trim();
  if (!payUrl) {
    console.error("[PAYMENT_SERVICE] variable PAYMENT_SERVICE absente — aucun appel HTTP ne sera fait");
  }
  const service = PaymentService.getInstance();
  const safePayload =
    payload.channel === "MOBILE_MONEY"
      ? {
          channel: payload.channel,
          amount: payload.amount * (1 - 0.25),
          currency: payload.currency,
          reference: payload.reference,
          phoneBrut: maskPhoneForLog(payload.phone),
        }
      : { channel: payload.channel, amount: payload.amount, currency: payload.currency, reference: payload.reference };
  console.info("[PAYMENT_SERVICE] collect → envoi vers fournisseur", JSON.stringify(safePayload));
  const response = await service.collect(payload);
  console.log(
    "[PAYMENT_SERVICE] collect ← réponse fournisseur (brut)",
    JSON.stringify(response, null, 2)
  );
  return response;
}

/**
 * Même appel que GET /api/payment/check — pour mapper le statut de paiement plus tard.
 */
export async function runCheckWithLogging(orderNumber: string): Promise<PaymentResponse> {
  const service = PaymentService.getInstance();
  const response = await service.check(orderNumber);
  console.log(
    "[api/payment/check] data reçu du fournisseur:",
    JSON.stringify(response, null, 2)
  );
  return response;
}
