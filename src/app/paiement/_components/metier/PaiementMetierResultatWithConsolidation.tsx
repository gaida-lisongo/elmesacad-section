"use client";

import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierRessourceCore from "@/app/paiement/_components/metier/PaiementMetierRessourceCore";
import StudentConsolidatedResultEmbed from "@/components/notes/StudentConsolidatedResultEmbed";

type Variant = "releve" | "fiche-validation";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  produitDetail: PaiementProduitDetailRecord | null;
  etudiant: PaiementEtudiantLocalView | null;
  variant: Variant;
  busy?: boolean;
  onRecheck?: () => void;
};

export default function PaiementMetierResultatWithConsolidation({
  commande,
  commandeId,
  produitDetail,
  etudiant,
  variant,
  busy,
  onRecheck,
}: Props) {
  const id = String(commandeId || commande.id || "").trim();

  return (
    <div className="space-y-2">
      <PaiementMetierRessourceCore
        commande={commande}
        commandeId={id}
        variant={variant}
        busy={busy}
        onRecheck={onRecheck}
        suppressAdministrativeMessage
      />
      <StudentConsolidatedResultEmbed
        commande={commande}
        produitDetail={produitDetail}
        etudiant={etudiant}
      />
    </div>
  );
}
