"use client";

import dynamic from "next/dynamic";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import { buildResolutionResume } from "@/app/paiement/_components/commandeResumePayload";

const QcmResolutionClient = dynamic(() => import("@/app/(site)/student/qcm/QcmResolutionClient"), {
  loading: () => <p className="text-sm text-slate-500">Chargement du module QCM…</p>,
});

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
};

export default function PaiementMetierQcmPanel({ commande, commandeId }: Props) {
  const ref = String(commande.ressource?.reference ?? "").trim();
  const resume = buildResolutionResume(commandeId, commande);
  if (!ref || !resume) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Données insuffisantes pour afficher le QCM (référence ou identité étudiant).
      </p>
    );
  }
  return (
    <QcmResolutionClient activiteIdRaw={ref} resumeFromPaidOrder={resume} embedded />
  );
}
