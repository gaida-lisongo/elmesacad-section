import type { ResolutionResumeFromPaidOrder } from "@/lib/commande/resolutionResumeTypes";

/** Commande telle que renvoyée par `getById` / `check` (résumé client). */
export type PaiementCommandeClientPayload = {
  id?: string;
  status?: string;
  student?: { email?: string; matricule?: string };
  ressource?: {
    reference?: string;
    produit?: string;
    categorie?: string;
    metadata?: Record<string, unknown>;
  };
  transaction?: {
    orderNumber?: string;
    amount?: number;
    currency?: string;
    phoneNumber?: string;
    microservice?: {
      orderId?: string;
      syncAttempted: boolean;
      success?: boolean;
      errorHint?: string;
    };
  };
};

export function buildResolutionResume(
  commandeId: string,
  payload: PaiementCommandeClientPayload
): ResolutionResumeFromPaidOrder | null {
  const email = String(payload.student?.email ?? "").trim();
  const matricule = String(payload.student?.matricule ?? "").trim();
  if (!email || !matricule) return null;
  return { commandeId, email, matricule };
}
