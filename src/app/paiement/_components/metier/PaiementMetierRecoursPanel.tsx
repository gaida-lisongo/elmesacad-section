"use client";

import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierRessourceCore from "@/app/paiement/_components/metier/PaiementMetierRessourceCore";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  busy?: boolean;
  onRecheck?: () => void;
};

export default function PaiementMetierRecoursPanel(props: Props) {
  return <PaiementMetierRessourceCore {...props} variant="recours" />;
}
