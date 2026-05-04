"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierRessourceCore from "@/app/paiement/_components/metier/PaiementMetierRessourceCore";
import PaiementMetierSujetWizard from "@/app/paiement/_components/metier/sujet/PaiementMetierSujetWizard";
import PaiementMetierSujetSuivi from "@/app/paiement/_components/metier/sujet/PaiementMetierSujetSuivi";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  busy?: boolean;
  onRecheck?: () => void;
};

export default function PaiementMetierSujetPanel({ commande, commandeId, busy, onRecheck }: Props) {
  const router = useRouter();
  const id = String(commandeId || commande.id || "").trim();
  const status = String(commande.status ?? "").trim();
  const etudiantServiceOrderId = commande.transaction?.microservice?.orderId;

  const handleSujetSubmitted = useCallback(() => {
    console.log("[sujet][panel] soumission OK → router.refresh()");
    router.refresh();
  }, [router]);

  return (
    <div className="space-y-4">
      <PaiementMetierRessourceCore
        commande={commande}
        commandeId={id}
        variant="sujet"
        busy={busy}
        onRecheck={onRecheck}
      />

      {status === "paid" ? (
        <PaiementMetierSujetWizard
          localCommandeId={id}
          etudiantServiceOrderId={etudiantServiceOrderId}
          onSubmitted={handleSujetSubmitted}
        />
      ) : status === "completed" ? (
        <PaiementMetierSujetSuivi etudiantServiceOrderId={etudiantServiceOrderId} />
      ) : (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
          Statut commande <span className="font-mono">{status || "—"}</span> : le formulaire sujet n&apos;est
          disponible qu&apos;après paiement confirmé (<span className="font-mono">paid</span>).
        </p>
      )}
    </div>
  );
}
