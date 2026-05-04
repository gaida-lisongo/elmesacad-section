import type { CommandeDoc } from "@/lib/models/Commande";

export type PaiementPagePhase = "verification" | "metier" | "completed" | "unknown";

/**
 * @param produitLigne `commande.ressource.produit` (ex. `sujet`) — utilisé pour garder la phase « métier »
 * après clôture locale, afin d’afficher le suivi (microservice étudiant) pour les commandes sujet.
 */
export function resolvePaiementPagePhase(
  status: CommandeDoc["status"] | string | undefined,
  produitLigne?: string | undefined
): PaiementPagePhase {
  const s = String(status ?? "").trim();
  const produit = String(produitLigne ?? "").trim();
  if (s === "pending" || s === "failed") return "verification";
  if (s === "paid") return "metier";
  if (s === "completed") {
    if (produit === "sujet") return "metier";
    return "completed";
  }
  return "unknown";
}
