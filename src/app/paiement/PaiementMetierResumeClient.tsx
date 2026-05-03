"use client";

import PaiementCommandeMetier from "./_components/PaiementCommandeMetier";
import PaiementProduitAvantMetier from "./_components/PaiementProduitAvantMetier";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementMetierHydrationSlice,
  PaiementProduitDetailRecord,
  PaiementProduitHydration,
} from "./_components/commandeResumePayload";

type Props = {
  commandeId: string;
  commande: PaiementCommandeClientPayload;
  produit: PaiementProduitHydration | null;
  etudiant: PaiementEtudiantLocalView | null;
  /** Document brut SSR (programme, branding, TP/QCM…) pour l’affichage avant routage métier. */
  produitDetail?: PaiementProduitDetailRecord | null;
  produitError?: string;
};

function metierSlice(
  etudiant: PaiementEtudiantLocalView | null,
  produit: PaiementProduitHydration | null,
  produitDetail: PaiementProduitDetailRecord | null | undefined,
  produitError: string | undefined
): PaiementMetierHydrationSlice {
  return {
    etudiantLocal: etudiant,
    produit,
    produitDetail: produitDetail ?? null,
    produitError,
  };
}

/**
 * Phase métier : données déjà résolues côté serveur (commande, produit, étudiant).
 * Présentation riche du produit puis enchaînement vers le panneau métier (QCM, TP, relevé…).
 */
export default function PaiementMetierResumeClient({
  commandeId,
  commande,
  produit,
  etudiant,
  produitDetail,
  produitError,
}: Props) {
  return (
    <div className="w-full min-w-0 max-w-none">
      <PaiementProduitAvantMetier
        produit={produit}
        produitDetail={produitDetail ?? null}
        produitError={produitError}
      />
      <PaiementCommandeMetier
        commandeId={commandeId}
        commande={commande}
        metierContext={metierSlice(etudiant, produit, produitDetail, produitError)}
      />
    </div>
  );
}
