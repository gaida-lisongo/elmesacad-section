"use client";

import { useCallback, useState } from "react";
import { generateBulletinPdfAction } from "@/actions/bulletinGenerate";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierResultatWithConsolidation from "@/app/paiement/_components/metier/PaiementMetierResultatWithConsolidation";
import { buildDocumentBulletinPayload } from "@/lib/paiement/documentBulletinPayload";
import { downloadPdfFromBase64 } from "@/lib/paiement/downloadPdfFromBase64";
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
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const onGenerateDocument = useCallback(
    async (payload: ConsolidatedResultDocumentPayload) => {
      const bulletinPayload = buildDocumentBulletinPayload(payload, {
        commande,
        commandeId,
        etudiant,
        produitDetail,
      });
      setGeneratingPdf(true);
      try {
        const result = await generateBulletinPdfAction(bulletinPayload);
        if (!result.ok) {
          console.error("[Fiche validation PDF]", result.message, result.details);
          window.alert(result.message);
          return;
        }
        downloadPdfFromBase64(result.pdfBase64, result.filename);
      } finally {
        setGeneratingPdf(false);
      }
    },
    [commande, commandeId, etudiant, produitDetail]
  );

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
      generateDocumentDisabled={Boolean(busy) || generatingPdf}
    />
  );
}
