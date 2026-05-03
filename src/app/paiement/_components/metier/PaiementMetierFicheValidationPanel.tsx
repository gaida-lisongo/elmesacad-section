"use client";

import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierResultatWithConsolidation from "@/app/paiement/_components/metier/PaiementMetierResultatWithConsolidation";
import { buildDocumentBulletinPayload } from "@/lib/paiement/documentBulletinPayload";
import type { ConsolidatedResultDocumentPayload } from "@/lib/notes/consolidatedResultTypes";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  produitDetail: PaiementProduitDetailRecord | null;
  etudiant: PaiementEtudiantLocalView | null;
  busy?: boolean;
  onRecheck?: () => void;
};

export default function PaiementMetierFicheValidationPanel({
  commande,
  commandeId,
  produitDetail,
  etudiant,
  busy,
  onRecheck,
}: Props) {
  const label = "Générer la Fiche de Validation";

  const onGenerateDocument = async (payload: ConsolidatedResultDocumentPayload) => {
    const bulletinPayload = buildDocumentBulletinPayload(payload, {
      commande,
      commandeId,
      etudiant,
    });
    console.log("Générer la Fiche de Validation", bulletinPayload);
  };

  return (
    <PaiementMetierResultatWithConsolidation
      commande={commande}
      commandeId={commandeId}
      produitDetail={produitDetail}
      etudiant={etudiant}
      variant="fiche-validation"
      busy={busy}
      onRecheck={onRecheck}
      onGenerateDocument={onGenerateDocument}
      generateDocumentLabel={label}
      generateDocumentDisabled={false}
    />
  );
}
