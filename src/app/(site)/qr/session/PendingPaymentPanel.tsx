"use client";

import { Icon } from "@iconify/react";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";

type Props = {
  commande: PaiementCommandeClientPayload;
  resourceDesignation?: string;
};

export default function PendingPaymentPanel({ commande, resourceDesignation }: Props) {
  const status = commande?.status || "attente";
  const amount = commande?.transaction?.amount ?? 0;
  const currency = commande?.transaction?.currency ?? "USD";
  const orderNumber = commande?.transaction?.orderNumber;
  const phone = commande?.transaction?.phoneNumber;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-amber-100 p-1 shadow-xl dark:border-amber-900/40 dark:from-amber-950/30 dark:via-darklight dark:to-amber-900/20">
      {/* Cercles décoratifs animés */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-300/20 blur-2xl dark:bg-amber-500/10" />
      <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-orange-300/20 blur-2xl dark:bg-orange-500/10" />

      <div className="relative rounded-[22px] bg-white/70 p-6 backdrop-blur-sm dark:bg-darklight/70 sm:p-8">
        {/* Icône + badge */}
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-amber-400/30" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30">
              <Icon icon="solar:clock-circle-bold-duotone" className="h-10 w-10" />
            </div>
          </div>

          <h2 className="mt-6 text-xl font-bold text-midnight_text dark:text-white sm:text-2xl">
            Paiement en attente de validation
          </h2>

          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-600" />
            </span>
            Statut : {status}
          </span>
        </div>

        {/* Récapitulatif */}
        <div className="mt-8 space-y-3 rounded-2xl border border-amber-100 bg-white p-4 shadow-sm dark:border-amber-900/20 dark:bg-black/20">
          {resourceDesignation && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Session</span>
              <span className="font-semibold text-midnight_text dark:text-white">{resourceDesignation}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Montant</span>
            <span className="font-bold text-midnight_text dark:text-white">
              {amount.toLocaleString("fr-FR")} {currency}
            </span>
          </div>
          {orderNumber && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">N° ordre</span>
              <span className="font-mono text-xs font-semibold text-midnight_text dark:text-white">{orderNumber}</span>
            </div>
          )}
          {phone && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500 dark:text-slate-400">Téléphone</span>
              <span className="font-semibold text-midnight_text dark:text-white">{phone}</span>
            </div>
          )}
        </div>

        {/* Message */}
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-800/30 dark:bg-amber-950/20 dark:text-amber-100">
          <div className="flex items-start gap-3">
            <Icon icon="solar:info-circle-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-300" />
            <div>
              <p className="font-semibold">Finalisez votre paiement au bureau de la section</p>
              <p className="mt-1 text-xs leading-relaxed opacity-90">
                Votre commande a bien été enregistrée. Pour la valider et générer votre macaron,
                présentez-vous au bureau de la section avec votre reçu de paiement.
                Une fois le paiement confirmé par l&apos;agent percepteur, vous pourrez télécharger
                votre macaron directement depuis cette page.
              </p>
            </div>
          </div>
        </div>

        {/* Conseils */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-black/20 dark:text-slate-300">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon="solar:wallet-money-bold-duotone" className="h-4 w-4" />
            </div>
            <span>Gardez votre preuve de paiement à portée de main.</span>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-xs text-slate-600 shadow-sm dark:border-slate-700 dark:bg-black/20 dark:text-slate-300">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Icon icon="solar:card-bold-duotone" className="h-4 w-4" />
            </div>
            <span>Présentez votre carte d&apos;étudiant si vous en avez une.</span>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          Cette page se mettra à jour automatiquement une fois le paiement validé.
        </p>
      </div>
    </div>
  );
}
