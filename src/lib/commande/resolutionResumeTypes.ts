/** Reprise du flux résolution depuis `/paiement` (commande déjà payée). */
export type ResolutionResumeFromPaidOrder = {
  commandeId: string;
  email: string;
  matricule: string;
};
