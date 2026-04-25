import { PaymentService, type CollectPayload, type PaymentResponse } from "@/lib/services/PaymentService";

/**
 * Même appel que POST /api/payment/collect — journalisation unique pour le debug.
 * À lire côté serveur pour identifier le champ orderNumber, statut, etc.
 */
export async function runCollectWithLogging(
  payload: CollectPayload
): Promise<PaymentResponse> {
  const service = PaymentService.getInstance();
  const response = await service.collect(payload);
  console.log(
    "[api/payment/collect] data reçu du fournisseur:",
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
