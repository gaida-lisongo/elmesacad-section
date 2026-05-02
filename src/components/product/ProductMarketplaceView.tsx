import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { ProductPageModel } from "@/lib/product/loadProductPageData";
import { formatProductPrice } from "@/lib/product/formatProductPrice";
import ProductPurchaseBar from "@/components/product/ProductPurchaseBar";

type Props = {
  model: ProductPageModel;
  categoryLabel: string;
  categoriePath: string;
};

export default function ProductMarketplaceView({ model, categoryLabel, categoriePath }: Props) {
  const isActivity = model.kind === "activity";
  const title = isActivity ? model.title : model.designation;
  const priceAmount = isActivity ? model.montant : model.amount;
  const priceCurrency = isActivity ? model.currency : model.currency;
  const status = isActivity ? model.status : model.status;
  const highlights = isActivity ? model.highlights : model.highlights;

  return (
    <div className="bg-gradient-to-b from-slate-100/90 via-slate-50 to-white dark:from-slate-950 dark:via-darkmode dark:to-darkmode">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-5">
            <div className="sticky top-24 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_20px_50px_-12px_rgba(15,23,42,0.18)] dark:border-slate-700 dark:bg-darklight dark:shadow-none">
              <div className="aspect-square bg-gradient-to-br from-primary/20 via-white to-slate-100 dark:from-primary/25 dark:via-slate-900 dark:to-slate-950">
                <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <span className="rounded-full border border-white/60 bg-white/90 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary shadow-sm dark:border-slate-600 dark:bg-slate-800/90">
                    {categoryLabel}
                  </span>
                  <Icon
                    icon={isActivity ? "solar:document-text-bold-duotone" : "solar:box-minimalistic-bold-duotone"}
                    className="text-8xl text-primary/85 drop-shadow-sm"
                  />
                  <p className="max-w-sm text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {isActivity ? model.summary : `Ressource officielle — ${model.apiCategorie}`}
                  </p>
                  <p className="text-2xl font-bold tabular-nums text-midnight_text dark:text-white">
                    {formatProductPrice(priceAmount, priceCurrency)}
                  </p>
                </div>
              </div>
              {isActivity && model.chargeHoraireId ? (
                <div className="border-t border-slate-100 p-4 dark:border-slate-700">
                  <Link
                    href={`/charge_horaire/${encodeURIComponent(model.chargeHoraireId)}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:gap-3 hover:underline"
                  >
                    <Icon icon="solar:calendar-bold-duotone" className="text-lg" />
                    Charge horaire associée
                  </Link>
                </div>
              ) : null}
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.12)] dark:border-slate-700 dark:bg-darklight dark:shadow-none sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-2xl font-bold leading-tight tracking-tight text-midnight_text dark:text-white sm:text-3xl lg:text-[2rem]">
                    {title}
                  </h2>
                  {isActivity ? (
                    <p className="mt-3 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                      <span className="font-semibold text-slate-800 dark:text-slate-100">{model.matiereLabel}</span>
                      <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                      {model.uniteLabel}
                      <span className="mx-1 text-slate-300 dark:text-slate-600">·</span>
                      {model.promotionLabel}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                      {model.sectionRefLabel ? (
                        <>
                          Section :{" "}
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {model.sectionRefLabel}
                          </span>
                        </>
                      ) : (
                        "Document ou service lié à votre section."
                      )}
                    </p>
                  )}
                </div>
                <span
                  className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold ${
                    String(status).toLowerCase() === "active"
                      ? "bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25 dark:text-emerald-300"
                      : "bg-amber-500/15 text-amber-900 ring-1 ring-amber-500/20 dark:text-amber-200"
                  }`}
                >
                  {status || "—"}
                </span>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-transparent px-5 py-4 ring-1 ring-primary/15">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Tarif
                  </p>
                  <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-primary">
                    {formatProductPrice(priceAmount, priceCurrency)}
                  </p>
                </div>
                {isActivity && model.noteMaximale > 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:ring-slate-700">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Notation</p>
                    <p className="mt-1 text-2xl font-bold text-midnight_text dark:text-white">
                      /{model.noteMaximale} pts
                    </p>
                  </div>
                ) : null}
                {!isActivity && model.matiereCredit > 0 ? (
                  <div className="rounded-2xl bg-slate-50 px-5 py-4 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:ring-slate-700">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Crédits</p>
                    <p className="mt-1 text-2xl font-bold text-midnight_text dark:text-white">{model.matiereCredit}</p>
                  </div>
                ) : null}
              </div>

              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {highlights.map((h) => (
                  <li
                    key={h}
                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-200"
                  >
                    <Icon icon="mdi:check-decagram-outline" className="mt-0.5 shrink-0 text-lg text-primary" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>

              {isActivity ? (
                <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Enseignant :</span>{" "}
                  {model.teacherLabel}
                </p>
              ) : model.lecteursLabel ? (
                <p className="mt-5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold text-slate-600 dark:text-slate-300">Encadrants :</span>{" "}
                  {model.lecteursLabel}
                </p>
              ) : null}

              <ProductPurchaseBar model={model} categoryLabel={categoryLabel} categoriePath={categoriePath} />

              <div className="mt-8 grid gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30 sm:grid-cols-3">
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon icon="solar:shield-check-bold" className="text-xl" />
                  </span>
                  <span className="text-xs leading-snug text-slate-600 dark:text-slate-400">
                    Paiement sécurisé (mobile money)
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon icon="solar:delivery-bold" className="text-xl" />
                  </span>
                  <span className="text-xs leading-snug text-slate-600 dark:text-slate-400">
                    Accès après validation du paiement
                  </span>
                </div>
                <div className="flex gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon icon="solar:headphones-round-sound-bold" className="text-xl" />
                  </span>
                  <span className="text-xs leading-snug text-slate-600 dark:text-slate-400">
                    Support scolarité INBTP
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-12 overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-16px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-darklight dark:shadow-none">
          <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-5 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-midnight_text dark:text-white sm:text-xl">
                  Description du produit
                </h2>
                <p className="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
                  Détails publiés par l&apos;établissement — présentation en sections, comme sur une fiche
                  marketplace.
                </p>
              </div>
              <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-700">
                INBTP Marketplace
              </span>
            </div>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {isActivity ? (
              <>
                <div className="px-6 py-6 sm:px-8">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Résumé pédagogique</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-200 sm:text-[15px]">
                    {model.summary}
                  </p>
                </div>
                <div className="px-6 py-6 sm:px-8">
                  <h3 className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Modalités</h3>
                  <ul className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                    <li className="flex flex-wrap gap-2">
                      <span className="font-semibold text-midnight_text dark:text-white">Contenu :</span>
                      <span>
                        {model.qcmCount} QCM, {model.tpCount} TP
                      </span>
                    </li>
                    {model.dateRemise ? (
                      <li className="flex flex-wrap gap-2">
                        <span className="font-semibold text-midnight_text dark:text-white">Échéance :</span>
                        <span>{model.dateRemise}</span>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </>
            ) : (
              model.descriptionSections.map((sec, idx) => (
                <div key={`${sec.title}-${idx}`} className="px-6 py-6 sm:px-8">
                  <h3 className="text-base font-bold text-midnight_text dark:text-white">{sec.title}</h3>
                  <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-slate-700 dark:text-slate-200 sm:text-[15px]">
                    {sec.contenu.map((line, lineIdx) => (
                      <li key={`${sec.title}-${lineIdx}`} className="flex gap-3">
                        <span
                          className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
