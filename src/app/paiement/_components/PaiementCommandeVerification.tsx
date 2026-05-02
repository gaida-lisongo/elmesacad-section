"use client";

type Props = {
  status: string;
  orderNumber?: string;
  busy: boolean;
  onSync: () => void;
};

/**
 * Bloc dédié à la synchronisation du statut paiement auprès du fournisseur (pending / failed).
 */
export default function PaiementCommandeVerification({ status, orderNumber, busy, onSync }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight">
      <p className="text-xs font-semibold uppercase tracking-wide text-primary">Vérification du paiement</p>
      <p className="mt-2 text-sm font-semibold text-midnight_text dark:text-white">Statut : {status}</p>
      {orderNumber ? (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          N° ordre : <span className="font-mono text-xs">{orderNumber}</span>
        </p>
      ) : (
        <p className="mt-2 text-sm text-slate-500">
          Aucun numéro d&apos;ordre encore enregistré — validez le push sur le téléphone puis synchronisez.
        </p>
      )}
      <button
        type="button"
        disabled={busy}
        onClick={() => onSync()}
        className="mt-4 w-full rounded-xl bg-primary py-3 text-sm font-semibold text-white hover:bg-darkprimary disabled:opacity-60"
      >
        {busy ? "…" : "Synchroniser le statut auprès du fournisseur"}
      </button>
    </div>
  );
}
