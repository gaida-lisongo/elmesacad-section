"use client";

import { useCallback, useState } from "react";
import { generateRelevePdfAction } from "@/actions/releveGenerate";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierResultatWithConsolidation from "@/app/paiement/_components/metier/PaiementMetierResultatWithConsolidation";
import { buildDocumentRelevePayload } from "@/lib/paiement/documentRelevePayload";
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

export default function PaiementMetierRelevePanel({
  commande,
  commandeId,
  produitDetail,
  etudiant,
  busy,
  onRecheck,
}: Props) {
  const label = "Générer le relevé de cotes";
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const onGenerateDocument = useCallback(
    async (payload: ConsolidatedResultDocumentPayload) => {
      const relevePayload = buildDocumentRelevePayload(payload, {
        commande,
        commandeId,
        etudiant,
        produitDetail,
      });
      setGeneratingPdf(true);
      try {
        const result = await generateRelevePdfAction(relevePayload);
        if (!result.ok) {
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
      variant="releve"
      busy={busy}
      onRecheck={onRecheck}
      onGenerateDocument={onGenerateDocument}
      generateDocumentLabel={label}
      generateDocumentDisabled={Boolean(busy) || generatingPdf}
    />
  );
}
