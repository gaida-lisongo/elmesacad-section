"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import type {
  PaiementCommandeClientPayload,
  PaiementEtudiantLocalView,
  PaiementMetierHydrationSlice,
  PaiementProduitDetailRecord,
} from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierQcmPanel from "@/app/paiement/_components/metier/PaiementMetierQcmPanel";
import PaiementMetierTpPanel from "@/app/paiement/_components/metier/PaiementMetierTpPanel";
import PaiementMetierRelevePanel from "@/app/paiement/_components/metier/PaiementMetierRelevePanel";
import PaiementMetierFicheValidationPanel from "@/app/paiement/_components/metier/PaiementMetierFicheValidationPanel";

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  /** Présent sur la page paiement après SSR : étudiant local, produit / section ; pas de re-check paiement. */
  metierContext?: PaiementMetierHydrationSlice;
  busy?: boolean;
  onRecheck?: () => void;
};

type MetierBodyProps = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  produitDetail: PaiementProduitDetailRecord | null;
  etudiant: PaiementEtudiantLocalView | null;
  busy?: boolean;
  onRecheck?: () => void;
};

function MetierContextPanel({
  commandeId,
  commande,
  ctx,
}: {
  commandeId: string;
  commande: PaiementCommandeClientPayload;
  ctx: PaiementMetierHydrationSlice;
}) {
  const tx = commande.transaction ?? {};
  const st = commande.student ?? {};
  const res = commande.ressource ?? {};

  return (
    <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm shadow-sm dark:border-slate-700 dark:bg-darklight">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Contexte de la commande</p>

      {ctx.produitError ? (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          {ctx.produitError}
        </p>
      ) : null}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Commande</p>
          <ul className="mt-2 space-y-1 text-slate-700 dark:text-slate-200">
            <li>
              <span className="text-slate-500">Réf. :</span>{" "}
              <span className="font-mono text-xs">{commandeId}</span>
            </li>
            <li>
              <span className="text-slate-500">Statut :</span> {String(commande.status ?? "—")}
            </li>
            {tx.orderNumber ? (
              <li>
                <span className="text-slate-500">N° ordre :</span>{" "}
                <span className="font-mono text-xs">{String(tx.orderNumber)}</span>
              </li>
            ) : null}
            <li>
              <span className="text-slate-500">Montant :</span> {String(tx.amount ?? "—")}{" "}
              {String(tx.currency ?? "")}
            </li>
            {tx.phoneNumber ? (
              <li>
                <span className="text-slate-500">Tél. paiement :</span> {String(tx.phoneNumber)}
              </li>
            ) : null}
            <li>
              <span className="text-slate-500">Ligne produit :</span> {String(res.produit ?? "—")} /{" "}
              {String(res.categorie ?? "—")}
            </li>
            {res.reference ? (
              <li>
                <span className="text-slate-500">Réf. ressource / activité :</span>{" "}
                <span className="font-mono text-xs">{String(res.reference)}</span>
              </li>
            ) : null}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Étudiant (profil local)</p>
          {ctx.etudiantLocal ? (
            <ul className="mt-2 space-y-1 text-slate-700 dark:text-slate-200">
              <li className="font-medium text-midnight_text dark:text-white">{ctx.etudiantLocal.name}</li>
              <li>
                <span className="text-slate-500">Matricule :</span> {ctx.etudiantLocal.matricule}
              </li>
              <li>
                <span className="text-slate-500">Email :</span> {ctx.etudiantLocal.email}
              </li>
              <li>
                <span className="text-slate-500">Téléphone :</span> {ctx.etudiantLocal.telephone || "—"}
              </li>
              <li>
                <span className="text-slate-500">Diplôme / cycle :</span> {ctx.etudiantLocal.diplome} —{" "}
                {ctx.etudiantLocal.cycle}
              </li>
              <li>
                <span className="text-slate-500">Ville :</span> {ctx.etudiantLocal.ville || "—"}
              </li>
              <li>
                <span className="text-slate-500">Statut compte :</span> {ctx.etudiantLocal.status}
              </li>
            </ul>
          ) : (
            <p className="mt-2 text-slate-600 dark:text-slate-300">
              Aucun profil étudiant local pour{" "}
              <span className="font-mono text-xs">
                {String(st.matricule ?? "")} / {String(st.email ?? "")}
              </span>
              .
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MetierBody({ commande, commandeId, produitDetail, etudiant, busy, onRecheck }: MetierBodyProps) {
  const produitLigne = String(commande.ressource?.produit ?? "").trim();
  const categorie = String(commande.ressource?.categorie ?? "").toUpperCase();

  if (produitLigne === "activite" && categorie === "QCM") {
    return <PaiementMetierQcmPanel commande={commande} commandeId={commandeId} />;
  }
  if (produitLigne === "activite" && categorie === "TP") {
    return <PaiementMetierTpPanel commande={commande} commandeId={commandeId} />;
  }
  if (produitLigne === "activite") {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Type d&apos;activité non reconnu (attendu QCM ou TP). Réf. :{" "}
        <span className="font-mono text-xs">{commande?.id?.toString() ?? ""}</span>
      </p>
    );
  }

  const panelProps = { commande, commandeId, produitDetail, etudiant, busy, onRecheck };
  switch (produitLigne) {
    case "releve":
      return <PaiementMetierRelevePanel {...panelProps} />;
    case "fiche-validation":
      return <PaiementMetierFicheValidationPanel {...panelProps} />;
    default:
      return (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Produit « {produitLigne || "—"} » : pas de panneau métier dédié pour l&apos;instant.
        </p>
      );
  }
}

/**
 * Après paiement validé : enchaîne le composant métier ad hoc (QCM, TP, relevé, …) sans quitter la page.
 */
export default function PaiementCommandeMetier({ commande, commandeId, metierContext, busy, onRecheck }: Props) {
  const status = String(commande.status ?? "");
  const produitLigne = String(commande.ressource?.produit ?? "").trim();
  const categorie = String(commande.ressource?.categorie ?? "").toUpperCase();
  const fullBleedQuestionnaire =
    produitLigne === "activite" && (categorie === "QCM" || categorie === "TP");

  const header = (
    <div className="flex items-start gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-emerald-700 dark:text-emerald-300">
        <Icon icon="solar:check-circle-bold" className="text-2xl" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
          {status === "completed" ? "Commande clôturée" : "Paiement confirmé"}
        </p>
        <h2 className="mt-1 text-base font-bold text-midnight_text dark:text-white">Suite de la commande</h2>
      </div>
    </div>
  );

  const contextBlock =
    metierContext != null ? (
      <MetierContextPanel commandeId={commandeId} commande={commande} ctx={metierContext} />
    ) : null;

  if (fullBleedQuestionnaire) {
    return (
      <div className="mt-6 w-full min-w-0 max-w-none">
        {contextBlock}
        <div className="border-b border-emerald-200/70 pb-4 dark:border-emerald-900/45">{header}</div>
        <div className="mt-6 w-full min-w-0">
          <MetierBody
            commande={commande}
            commandeId={commandeId}
            produitDetail={metierContext?.produitDetail ?? null}
            etudiant={metierContext?.etudiantLocal ?? null}
            busy={busy}
            onRecheck={onRecheck}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 w-full min-w-0 max-w-none">
      {contextBlock}
      <div className="rounded-2xl border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-white p-5 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/30 dark:to-darklight">
        {header}
        <div className="mt-4">
          <MetierBody
            commande={commande}
            commandeId={commandeId}
            produitDetail={metierContext?.produitDetail ?? null}
            etudiant={metierContext?.etudiantLocal ?? null}
            busy={busy}
            onRecheck={onRecheck}
          />
        </div>
      </div>
    </div>
  );
}
