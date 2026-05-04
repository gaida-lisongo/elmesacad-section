import Link from "next/link";
import ClientIcon from "@/components/Common/ClientIcon";
import type { ProductPageModel } from "@/lib/product/loadProductPageData";
import { formatProductPrice } from "@/lib/product/formatProductPrice";
import ProductPurchaseBar from "@/components/product/ProductPurchaseBar";

type Props = {
  model: ProductPageModel;
  categoryLabel: string;
  categoriePath: string;
};

function formatNaturalDate(value: string): string {
  if (!value) return "Non définie";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function ProductMarketplaceView({ model, categoryLabel, categoriePath }: Props) {
  const isActivity = model.kind === "activity";
  const title = isActivity ? model.title : model.designation;
  const priceAmount = isActivity ? model.montant : model.amount;
  const priceCurrency = isActivity ? model.currency : model.currency;
  const status = isActivity ? model.status : model.status;
  const highlights = isActivity ? model.highlights : model.highlights;

  return (
    <div className="bg-[#f8fafc] dark:bg-darkmode">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left Column: Visual Card */}
          <div className="lg:col-span-5">
            <div className="sticky top-28 overflow-hidden rounded-[2.5rem] border border-slate-200 bg-white shadow-2xl shadow-slate-200/50 dark:border-slate-800 dark:bg-gray-900 dark:shadow-none">
              <div 
                className="relative aspect-[4/5] w-full overflow-hidden bg-slate-900"
                style={{ 
                  backgroundImage: "url('/images/inbtp/jpg/img-7.jpg')", 
                  backgroundSize: "cover", 
                  backgroundPosition: "center" 
                }}
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                
                <div className="absolute inset-0 flex flex-col justify-between p-8">
                  <div className="flex justify-start">
                    <span className="rounded-full bg-white/10 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white backdrop-blur-md ring-1 ring-white/20">
                      {categoryLabel}
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-xl shadow-primary/20">
                      <ClientIcon
                        icon={isActivity ? "solar:document-bold-duotone" : "solar:box-minimalistic-bold-duotone"}
                        className="h-10 w-10"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-300">Tarif de la ressource</p>
                      <p className="text-4xl font-black tabular-nums text-white">
                        {formatProductPrice(priceAmount, priceCurrency)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {isActivity && model.chargeHoraireId ? (
                <div className="p-6">
                  <Link
                    href={`/charge_horaire/${encodeURIComponent(model.chargeHoraireId)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 py-3 text-sm font-bold text-primary transition hover:bg-primary/10 dark:bg-slate-800 dark:text-primary dark:hover:bg-primary/20"
                  >
                    <ClientIcon icon="solar:calendar-bold-duotone" className="h-5 w-5" />
                    Consulter la charge horaire
                  </Link>
                </div>
              ) : (
                <div className="p-6">
                   <div className="flex items-center gap-3 rounded-2xl bg-primary/5 p-4 text-primary">
                      <ClientIcon icon="solar:info-circle-bold-duotone" className="h-6 w-6 shrink-0" />
                      <p className="text-xs font-bold leading-relaxed">Ressource officielle certifiée par les services académiques de l&apos;INBTP.</p>
                   </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Details */}
          <div className="lg:col-span-7">
            <div className="space-y-8">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                    String(status).toLowerCase() === "active"
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                  }`}>
                    {status || "Statut inconnu"}
                  </span>
                  <span className="h-1 w-1 rounded-full bg-slate-300" />
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">ID: {model.id.slice(-8)}</span>
                </div>

                <h1 className="text-3xl font-black leading-tight text-slate-900 dark:text-white sm:text-4xl lg:text-5xl">
                  {title}
                </h1>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm font-medium text-slate-600 dark:text-slate-400">
                  {isActivity ? (
                    <>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                        <ClientIcon icon="solar:book-bold-duotone" className="text-primary" />
                        {model.matiereLabel}
                      </div>
                      <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                        <ClientIcon icon="solar:layers-bold-duotone" className="text-primary" />
                        {model.promotionLabel}
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-1.5 dark:bg-slate-800">
                      <ClientIcon icon="solar:users-group-rounded-bold-duotone" className="text-primary" />
                      {model.sectionRefLabel || "Section INBTP"}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {isActivity && model.noteMaximale > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-gray-900">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Notation maximale</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">{model.noteMaximale}</span>
                      <span className="text-sm font-bold text-slate-400">points</span>
                    </div>
                  </div>
                )}
                {!isActivity && model.matiereCredit > 0 && (
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-gray-900">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Valeur académique</p>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-slate-900 dark:text-white">{model.matiereCredit}</span>
                      <span className="text-sm font-bold text-slate-400">crédits</span>
                    </div>
                  </div>
                )}
                <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-gray-900">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Responsable</p>
                  <p className="mt-2 text-lg font-bold text-slate-900 dark:text-white truncate">
                    {isActivity ? model.teacherLabel : (model.lecteursLabel || "INBTP Académique")}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Points forts</h3>
                <ul className="grid gap-3 sm:grid-cols-2">
                  {highlights.map((h) => (
                    <li
                      key={h}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm font-medium text-slate-700 shadow-sm dark:border-slate-800 dark:bg-gray-900/50 dark:text-slate-300"
                    >
                      <ClientIcon icon="solar:check-circle-bold-duotone" className="h-5 w-5 text-primary" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-[2.5rem] bg-white p-8 shadow-xl shadow-slate-200/40 dark:bg-gray-900 dark:shadow-none">
                <ProductPurchaseBar model={model} categoryLabel={categoryLabel} categoriePath={categoriePath} />
                
                <div className="mt-8 grid gap-6 border-t border-slate-100 pt-8 dark:border-slate-800 sm:grid-cols-3">
                  <FeatureItem icon="solar:shield-check-bold-duotone" label="Paiement 100% sécurisé" />
                  <FeatureItem icon="solar:plain-2-bold-duotone" label="Accès immédiat après validation" />
                  <FeatureItem icon="solar:clapperboard-edit-bold-duotone" label="Support technique dédié" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: Description */}
        <section className="mt-20">
          <div className="mb-10 flex items-center gap-4">
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Description détaillée</h2>
            <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
          </div>

          <div className="rounded-[3rem] border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-gray-900 md:p-12">
            <div className="grid gap-12 lg:grid-cols-2">
              {isActivity ? (
                <>
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 dark:text-white">
                      <ClientIcon icon="solar:notes-bold-duotone" className="text-primary" />
                      Objectifs pédagogiques
                    </h3>
                    <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                      {model.summary}
                    </p>
                  </div>
                  <div className="space-y-4">
                    <h3 className="flex items-center gap-3 text-lg font-black text-slate-900 dark:text-white">
                      <ClientIcon icon="solar:settings-bold-duotone" className="text-primary" />
                      Modalités de réalisation
                    </h3>
                    <ul className="space-y-4">
                      <ModaliteItem label="Volume de travail" value={`${model.qcmCount} QCM et ${model.tpCount} Travaux Pratiques`} />
                      {model.dateRemise && <ModaliteItem label="Date limite de remise" value={formatNaturalDate(model.dateRemise)} />}
                      <ModaliteItem label="Méthode d'accès" value="Téléchargement après paiement mobile money" />
                    </ul>
                  </div>
                </>
              ) : (
                model.descriptionSections.map((sec, idx) => (
                  <div key={`${sec.title}-${idx}`} className="space-y-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">{sec.title}</h3>
                    <ul className="space-y-3">
                      {sec.contenu.map((line, lineIdx) => (
                        <li key={`${sec.title}-${lineIdx}`} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                          <span className="mt-2.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                          <span className="leading-relaxed">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureItem({ icon, label }: { icon: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-primary dark:bg-slate-800">
        <ClientIcon icon={icon} className="h-6 w-6" />
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    </div>
  );
}

function ModaliteItem({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex flex-col border-b border-slate-100 pb-3 last:border-0 dark:border-slate-800">
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span>
      <span className="mt-1 font-bold text-slate-900 dark:text-white">{value}</span>
    </li>
  );
}
