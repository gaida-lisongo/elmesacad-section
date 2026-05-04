"use client";

import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";

export type RessourceMetierVariant =
  | "releve"
  | "fiche-validation"
  | "sujet"
  | "stage"
  | "laboratoire"
  | "session"
  | "recours";

const VARIANT_COPY: Record<
  RessourceMetierVariant,
  { title: string; short: string }
> = {
  releve: {
    title: "Relevé de cotes",
    short: "Votre demande est transmise au service étudiant. Vous serez notifié lorsque le document sera disponible.",
  },
  "fiche-validation": {
    title: "Fiche de validation",
    short: "Votre demande est enregistrée. Le traitement suit le circuit administratif prévu par l’INBTP.",
  },
  sujet: {
    title: "Sujet de mémoire",
    short: "Votre commande de sujet est enregistrée. Complétez les informations si le service étudiant vous le demande.",
  },
  stage: {
    title: "Stage",
    short: "Votre demande de stage est enregistrée sur votre dossier.",
  },
  laboratoire: {
    title: "Laboratoire",
    short: "Votre inscription travaux pratiques est transmise.",
  },
  session: {
    title: "Enrôlement — session d'examen",
    short: "Votre commande de session est enregistrée. Les matières concernées sont listées ci-dessous.",
  },
  recours: {
    title: "Recours",
    short: "Votre demande de recours est enregistrée.",
  },
};

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
  variant: RessourceMetierVariant;
  busy?: boolean;
  onRecheck?: () => void;
  /** Masque le paragraphe « circuit administratif » (fiche / relevé) quand la synthèse des notes est affichée au-dessus. */
  suppressAdministrativeMessage?: boolean;
};

function pickMetaString(meta: Record<string, unknown> | undefined, key: string): string {
  if (!meta) return "";
  const v = meta[key];
  return typeof v === "string" ? v.trim() : "";
}

export default function PaiementMetierRessourceCore({
  commande,
  commandeId,
  variant,
  busy,
  onRecheck,
  suppressAdministrativeMessage,
}: Props) {
  const copy = VARIANT_COPY[variant];
  const meta = commande.ressource?.metadata ?? {};
  const title =
    pickMetaString(meta, "productTitle") ||
    copy.title;
  const ref = String(commande.ressource?.reference ?? "").trim();
  const categoriePath = pickMetaString(meta, "categoriePath");
  const productHref =
    categoriePath && ref
      ? `/product/${encodeURIComponent(categoriePath)}?productId=${encodeURIComponent(ref)}`
      : null;
  const ms = commande.transaction?.microservice;

  return (
    <div className="space-y-4 text-sm text-slate-700 dark:text-slate-200">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-slate-600 dark:bg-slate-900/50">
        <Icon
          icon="solar:document-medicine-bold-duotone"
          className="mt-0.5 shrink-0 text-2xl text-primary"
          aria-hidden
        />
        <div>
          <p className="font-semibold text-midnight_text dark:text-white">{copy.title}</p>
          <p className="mt-1 text-sm font-medium text-primary">{title}</p>
          {!suppressAdministrativeMessage ? (
            <p className="mt-2 text-slate-600 dark:text-slate-300">{copy.short}</p>
          ) : null}
        </div>
      </div>

      {ms?.syncAttempted ? (
        ms.success !== false && ms.orderId ? (
          <p className="rounded-lg border border-slate-200 bg-white/80 px-3 py-2 dark:border-slate-600 dark:bg-slate-900/40">
            Réf. service étudiant :{" "}
            <span className="font-mono text-xs text-primary">{ms.orderId}</span>
          </p>
        ) : ms.errorHint ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
            Synchronisation : {ms.errorHint}
          </p>
        ) : (
          <p className="text-slate-600 dark:text-slate-400">
            Statut de synchronisation à vérifier côté administration si le besoin persiste.
          </p>
        )
      ) : (
        <p className="text-slate-600 dark:text-slate-400">
          Synchronisation en cours ou en attente — utilisez « Revérifier » après quelques instants.
        </p>
      )}

      {productHref ? (
        <Link
          href={productHref}
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-midnight_text hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          Retour à la fiche produit
        </Link>
      ) : (
        <Link
          href="/etudes"
          className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-midnight_text hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
        >
          Retour au catalogue
        </Link>
      )}

      {onRecheck ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => onRecheck()}
          className="w-full rounded-xl border border-slate-200 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {busy ? "…" : "Revérifier le statut auprès du fournisseur"}
        </button>
      ) : null}

      <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
        Commande <span className="font-mono">{commandeId}</span>
      </p>
    </div>
  );
}
