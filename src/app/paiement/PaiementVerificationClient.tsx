"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { syncPaiementCommandePaymentAction } from "@/actions/paiementCommandeSync";
import PaiementCommandeVerification from "./_components/PaiementCommandeVerification";
import type { PaiementCommandeClientPayload } from "./_components/commandeResumePayload";

type Props = {
  commandeId: string;
  commande: PaiementCommandeClientPayload;
};

export default function PaiementVerificationClient({ commandeId, commande }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const status = String(commande.status ?? "—");
  const tx = commande.transaction ?? {};
  const orderNumber = tx.orderNumber != null ? String(tx.orderNumber) : undefined;

  const onSync = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await syncPaiementCommandePaymentAction(commandeId);
      if (!r.ok) {
        throw new Error(r.message);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <div className="mt-6">
        <PaiementCommandeVerification
          status={status}
          orderNumber={orderNumber}
          busy={busy}
          onSync={() => void onSync()}
        />
      </div>
    </>
  );
}
