"use client";

import Link from "next/link";
import type { PaiementCommandeClientPayload } from "./_components/commandeResumePayload";

type Props = {
  commandeId: string;
  commande: PaiementCommandeClientPayload;
};

export default function PaiementCompletedClient({ commandeId, commande }: Props) {
  const tx = commande.transaction ?? {};
  const orderNumber = tx.orderNumber != null ? String(tx.orderNumber) : undefined;

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-darklight">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Commande clôturée</p>
      <h2 className="mt-2 text-lg font-bold text-midnight_text dark:text-white">Merci — tout est finalisé</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
        Cette commande est terminée. Aucune autre action n&apos;est requise sur cette page.
      </p>
      {orderNumber ? (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
          N° ordre : <span className="font-mono text-xs">{orderNumber}</span>
        </p>
      ) : null}
      <p className="mt-3 text-xs text-slate-500">
        Réf. commande : <span className="font-mono">{commandeId}</span>
      </p>
      <Link
        href="/etudes"
        className="mt-6 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-darkprimary"
      >
        Retour aux études
      </Link>
    </div>
  );
}
