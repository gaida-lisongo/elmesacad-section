"use client";

/**
 * Formulaire étudiant pour finaliser la commande après paiement.
 * Les champs seront branchés quand le métier / parcours sera précisé.
 */
type Props = {
  commandeId: string;
};

export default function PaiementCommandeComplementEtudiant({ commandeId }: Props) {
  return (
    <section
      className="mt-4 rounded-xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
      aria-labelledby="paiement-complement-heading"
    >
      <h2 id="paiement-complement-heading" className="text-sm font-bold text-midnight_text dark:text-white">
        Compléter la commande
      </h2>
      <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
        Cette zone accueillera le formulaire (champs et envoi) pour compléter votre dossier lié à cette commande.
      </p>
      <p className="mt-3 text-[10px] text-slate-400 dark:text-slate-500">
        Référence commande <span className="font-mono">{commandeId}</span>
      </p>
    </section>
  );
}
