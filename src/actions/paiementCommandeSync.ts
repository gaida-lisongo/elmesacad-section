"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import { syncCommandePaymentStatusFromProvider } from "@/lib/commande/commandePayment";

/**
 * Vérifie le paiement auprès du fournisseur et met à jour la commande en base (appelé depuis l’UI, pas via fetch client vers l’API route).
 */
export async function syncPaiementCommandePaymentAction(
  commandeId: string
): Promise<{ ok: true; message: string } | { ok: false; message: string }> {
  const id = String(commandeId ?? "").trim();
  if (!id) return { ok: false, message: "Identifiant commande manquant." };

  await connectDB();
  const commande = await CommandeModel.findById(id);
  if (!commande) return { ok: false, message: "Commande introuvable." };

  if (commande.status === "completed") {
    revalidatePath("/paiement");
    return { ok: true, message: "Commande déjà clôturée." };
  }

  try {
    await syncCommandePaymentStatusFromProvider(commande);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Erreur lors de la synchronisation." };
  }

  revalidatePath("/paiement");
  return { ok: true, message: "Statut actualisé." };
}
