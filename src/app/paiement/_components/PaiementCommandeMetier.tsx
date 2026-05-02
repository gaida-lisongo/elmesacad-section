"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierQcmPanel from "@/app/paiement/_components/metier/PaiementMetierQcmPanel";
import PaiementMetierTpPanel from "@/app/paiement/_components/metier/PaiementMetierTpPanel";
import PaiementMetierRelevePanel from "@/app/paiement/_components/metier/PaiementMetierRelevePanel";
import PaiementMetierFicheValidationPanel from "@/app/paiement/_components/metier/PaiementMetierFicheValidationPanel";
import PaiementMetierSujetPanel from "@/app/paiement/_components/metier/PaiementMetierSujetPanel";
import PaiementMetierStagePanel from "@/app/paiement/_components/metier/PaiementMetierStagePanel";
import PaiementMetierLaboratoirePanel from "@/app/paiement/_components/metier/PaiementMetierLaboratoirePanel";
import PaiementMetierSessionPanel from "@/app/paiement/_components/metier/PaiementMetierSessionPanel";
import PaiementMetierRecoursPanel from "@/app/paiement/_components/metier/PaiementMetierRecoursPanel";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  busy?: boolean;
  onRecheck?: () => void;
};

function MetierBody({ commande, commandeId, busy, onRecheck }: Props) {
  const produit = String(commande.ressource?.produit ?? "").trim();
  const categorie = String(commande.ressource?.categorie ?? "").toUpperCase();

  if (produit === "activite" && categorie === "QCM") {
    return <PaiementMetierQcmPanel commande={commande} commandeId={commandeId} />;
  }
  if (produit === "activite" && categorie === "TP") {
    return <PaiementMetierTpPanel commande={commande} commandeId={commandeId} />;
  }
  if (produit === "activite") {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Type d&apos;activité non reconnu (attendu QCM ou TP). Réf. :{" "}
        <span className="font-mono text-xs">{commandeId}</span>
      </p>
    );
  }

  const panelProps = { commande, commandeId, busy, onRecheck };
  switch (produit) {
    case "releve":
      return <PaiementMetierRelevePanel {...panelProps} />;
    case "fiche-validation":
      return <PaiementMetierFicheValidationPanel {...panelProps} />;
    case "sujet":
      return <PaiementMetierSujetPanel {...panelProps} />;
    case "stage":
      return <PaiementMetierStagePanel {...panelProps} />;
    case "laboratoire":
      return <PaiementMetierLaboratoirePanel {...panelProps} />;
    case "session":
      return <PaiementMetierSessionPanel {...panelProps} />;
    case "recours":
      return <PaiementMetierRecoursPanel {...panelProps} />;
    default:
      return (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Produit « {produit || "—"} » : pas de panneau métier dédié pour l&apos;instant.
        </p>
      );
  }
}

/**
 * Après paiement validé : enchaîne le composant métier ad hoc (QCM, TP, relevé, …) sans quitter la page.
 */
export default function PaiementCommandeMetier({ commande, commandeId, busy, onRecheck }: Props) {
  const status = String(commande.status ?? "");

  return (
    <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-darklight">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
          <Icon icon="solar:check-circle-bold" className="text-2xl" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            {status === "completed" ? "Commande clôturée" : "Paiement confirmé"}
          </p>
          <h2 className="mt-1 text-base font-bold text-midnight_text dark:text-white">Suite de la commande</h2>
        </div>
      </div>

      <div className="mt-4">
        <MetierBody commande={commande} commandeId={commandeId} busy={busy} onRecheck={onRecheck} />
      </div>
    </div>
  );
}
