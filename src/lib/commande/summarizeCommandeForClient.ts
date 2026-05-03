import type { CommandeDoc } from "@/lib/models/Commande";
import { extractMicroserviceOrderId } from "@/lib/commande/extractMicroserviceOrderId";

export function summarizeMicroserviceForClient(ms: unknown): {
  orderId?: string;
  syncAttempted: boolean;
  success?: boolean;
  errorHint?: string;
} {
  if (ms == null || (typeof ms !== "object" && typeof ms !== "string")) {
    return { syncAttempted: false };
  }
  const orderId = extractMicroserviceOrderId(ms);
  if (typeof ms === "string") {
    return { syncAttempted: true, orderId, success: Boolean(orderId) };
  }
  const o = ms as Record<string, unknown>;
  const success = o.success === true;
  const err =
    typeof o.error === "string"
      ? o.error
      : typeof o.message === "string"
        ? o.message
        : undefined;
  return {
    syncAttempted: true,
    orderId,
    success: success || Boolean(orderId),
    errorHint: success ? undefined : err,
  };
}

export function summarizeCommandeForClient(commande: {
  _id: unknown;
  status: CommandeDoc["status"];
  transaction?: CommandeDoc["transaction"];
  ressource?: CommandeDoc["ressource"];
  student?: CommandeDoc["student"];
}) {
  const ms = commande.transaction?.microserviceResponse;
  const meta = commande.ressource?.metadata;
  const metadata =
    meta != null && typeof meta === "object" && !Array.isArray(meta) ? (meta as Record<string, unknown>) : {};
  return {
    id: String(commande._id),
    status: commande.status,
    transaction: {
      orderNumber: commande.transaction?.orderNumber,
      amount: commande.transaction?.amount,
      currency: commande.transaction?.currency,
      phoneNumber: commande.transaction?.phoneNumber,
      microservice: summarizeMicroserviceForClient(ms),
    },
    ressource: {
      reference: commande.ressource?.reference,
      produit: commande.ressource?.produit,
      categorie: commande.ressource?.categorie,
      metadata,
    },
    student: {
      email: commande.student?.email,
      matricule: commande.student?.matricule,
    },
  };
}
