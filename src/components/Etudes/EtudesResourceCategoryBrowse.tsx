"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { PublicSectionCard } from "@/actions/publicSections";
import type { ResourceProductVM } from "@/lib/product/loadProductPageData";
import { humanizeProductCategory } from "@/lib/product/productRoute";
import { formatProductPrice } from "@/lib/product/formatProductPrice";
import ProductPurchaseBar from "@/components/product/ProductPurchaseBar";

export type EtudesResourceHubKey =
  | "fiches-validation"
  | "enrollements"
  | "releves"
  | "laboratoires"
  | "lettres-stage"
  | "sujets-recherche";

type Props = {
  section: PublicSectionCard;
  focus: EtudesResourceHubKey;
  items: ResourceProductVM[];
  onBack: () => void;
};

const FOCUS_META: Record<
  EtudesResourceHubKey,
  { title: string; titleAccent: string; subtitle: string; categoriePath: string }
> = {
  "fiches-validation": {
    title: "Fiches de",
    titleAccent: "validation",
    subtitle: "Documents officiels de validation de parcours pour votre section.",
    categoriePath: "fiche-validation",
  },
  enrollements: {
    title: "Sessions d'",
    titleAccent: "enrôlement",
    subtitle: "Inscriptions et sessions liées à votre faculté.",
    categoriePath: "session",
  },
  releves: {
    title: "Relevés de",
    titleAccent: "cotes",
    subtitle: "Demandes de relevés de notes pour les étudiants de la section.",
    categoriePath: "releve",
  },
  laboratoires: {
    title: "Ressources",
    titleAccent: "laboratoire",
    subtitle: "Accès et services laboratoire proposés par la section.",
    categoriePath: "laboratoire",
  },
  "lettres-stage": {
    title: "Lettres de",
    titleAccent: "stage",
    subtitle: "Formalités et attestations de stage.",
    categoriePath: "stage",
  },
  "sujets-recherche": {
    title: "Sujets de",
    titleAccent: "recherche",
    subtitle: "Thématiques et sujets encadrés par la recherche.",
    categoriePath: "sujet",
  },
};

function minMaxPrices(items: ResourceProductVM[]): { min: number; max: number; currency: string } | null {
  if (!items.length) return null;
  let min = Number.POSITIVE_INFINITY;
  let max = 0;
  let currency = "USD";
  for (const r of items) {
    const a = Number(r.amount) || 0;
    min = Math.min(min, a);
    max = Math.max(max, a);
    currency = r.currency || currency;
  }
  if (!Number.isFinite(min)) return null;
  return { min, max, currency };
}

export default function EtudesResourceCategoryBrowse({ section, focus, items, onBack }: Props) {
  const meta = FOCUS_META[focus];
  const pathForCommande = meta.categoriePath;
  const [checkout, setCheckout] = useState<ResourceProductVM | null>(null);

  const categoryLabel = useMemo(() => humanizeProductCategory(meta.categoriePath), [meta.categoriePath]);
  const metrics = useMemo(() => minMaxPrices(items), [items]);

  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
      <button
        type="button"
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
      >
        <Icon icon="solar:arrow-left-linear" className="text-lg" aria-hidden />
        Retour à {section.name}
      </button>

      <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <h2 className="text-3xl font-black leading-tight tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            {meta.title}{" "}
            <span className="font-black text-transparent [-webkit-text-stroke:1px_rgb(15,23,42)] dark:[-webkit-text-stroke-color:white]">
              {meta.titleAccent}
            </span>
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{meta.subtitle}</p>

          <div className="mt-8 flex min-h-[180px] items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 dark:border-slate-700 dark:from-slate-900/60 dark:to-darklight">
            <div className="text-center">
              <Icon icon="solar:documents-bold-duotone" className="mx-auto text-6xl text-primary/80" aria-hidden />
              <p className="mt-3 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {section.name}
              </p>
            </div>
          </div>

          <div className="mt-8 space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Indicateurs</p>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-slate-600 dark:text-slate-300">Offres publiées</span>
              <span className="text-2xl font-bold tabular-nums text-midnight_text dark:text-white">{items.length}</span>
            </div>
            {metrics ? (
              <div className="flex items-baseline justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-700">
                <span className="text-sm text-slate-600 dark:text-slate-300">Fourchette de prix</span>
                <span className="text-sm font-semibold text-midnight_text dark:text-white">
                  {metrics.min === metrics.max
                    ? formatProductPrice(metrics.min, metrics.currency)
                    : `${formatProductPrice(metrics.min, metrics.currency)} — ${formatProductPrice(metrics.max, metrics.currency)}`}
                </span>
              </div>
            ) : null}
            <p className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
              Les textes de présentation détaillés par catégorie pourront être affinés ultérieurement.
            </p>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition hover:text-primary dark:text-slate-200"
          >
            Voir toutes les ressources de la faculté
            <span aria-hidden className="text-lg">
              →
            </span>
          </button>
        </div>

        <div className="lg:col-span-8">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-10 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
              Aucune ressource publiée pour cette catégorie pour le moment.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setCheckout(r)}
                  className="group relative flex w-full border border-slate-200 bg-white text-left shadow-md transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-darklight"
                >
                  <span className="w-1 shrink-0 bg-red-600" aria-hidden />
                  <div className="flex min-w-0 flex-1 flex-col gap-2 p-4 pr-12">
                    <p className="text-base font-bold leading-snug text-slate-900 dark:text-white">{r.designation}</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{categoryLabel}</p>
                    <div className="mt-1 flex flex-col gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                      <span className="inline-flex items-center gap-2">
                        <Icon icon="solar:wallet-money-bold" className="text-base text-slate-400" aria-hidden />
                        {formatProductPrice(r.amount, r.currency)}
                      </span>
                      {r.matiereCredit > 0 ? (
                        <span className="inline-flex items-center gap-2">
                          <Icon icon="solar:diploma-bold" className="text-base text-slate-400" aria-hidden />
                          {r.matiereCredit} crédit(s)
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <span
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-3xl font-light text-slate-900 transition group-hover:translate-x-0.5 dark:text-white"
                    aria-hidden
                  >
                    →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {checkout ? (
        <ProductPurchaseBar
          key={checkout.id}
          model={checkout}
          categoryLabel={categoryLabel}
          categoriePath={pathForCommande}
          embedTrigger
        />
      ) : null}
    </main>
  );
}
