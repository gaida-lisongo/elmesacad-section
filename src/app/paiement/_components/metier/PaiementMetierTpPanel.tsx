"use client";

import dynamic from "next/dynamic";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import { buildResolutionResume } from "@/app/paiement/_components/commandeResumePayload";

const TpResolutionClient = dynamic(() => import("@/app/(site)/student/tp/TpResolutionClient"), {
  loading: () => <p className="text-sm text-slate-500">Chargement du module TP…</p>,
});

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
};

export default function PaiementMetierTpPanel({ commande, commandeId }: Props) {
  const ref = String(commande.ressource?.reference ?? "").trim();
  const resume = buildResolutionResume(commandeId, commande);
  if (!ref || !resume) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Données insuffisantes pour afficher le TP (référence ou identité étudiant).
      </p>
    );
  }
  return (
    <TpResolutionClient activiteIdRaw={ref} resumeFromPaidOrder={resume} embedded />
  );
}
