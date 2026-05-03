"use client";

import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierResultatWithConsolidation from "@/app/paiement/_components/metier/PaiementMetierResultatWithConsolidation";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  produitDetail: PaiementProduitDetailRecord | null;
  etudiant: PaiementEtudiantLocalView | null;
  busy?: boolean;
  onRecheck?: () => void;
};

export default function PaiementMetierFicheValidationPanel(props: Props) {
  return <PaiementMetierResultatWithConsolidation {...props} variant="fiche-validation" />;
}
