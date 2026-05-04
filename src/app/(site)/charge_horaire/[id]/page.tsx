import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ClientIcon from "@/components/Common/ClientIcon";
import { getPublicChargeDetail, type ChargeHoraireDetail, type ChargeDescriptorSection } from "@/actions/publicCharges";
import Breadcrumb from "@/components/Common/Breadcrumb";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ChargeHoraireDetailPage({ params }: Props) {
  const { id } = await params;
  const charge = await getPublicChargeDetail(id);

  if (!charge) notFound();

  return (
    <>
      <Breadcrumb
        pageName={charge.matiere.designation}
        pageDescription={`${charge.unite.code_unite} — ${charge.unite.designation}`}
        trail={[
          { label: "Accueil", href: "/" },
          { label: "Études", href: "/etudes" },
          { label: "Détail du cours", href: "#" },
        ]}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Main Content */}
          <div className="lg:col-span-8">
            <header className="mb-10">
              <span className="inline-block rounded-full bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-primary">
                {charge.unite.code_unite}
              </span>
              <h1 className="mt-4 text-4xl font-black text-slate-900 dark:text-white md:text-5xl">
                {charge.matiere.designation}
              </h1>
              <p className="mt-4 text-xl text-slate-600 dark:text-slate-400">
                {charge.promotion.designation} · {charge.unite.semestre}
              </p>
            </header>

            <div className="space-y-12">
              <DescriptorSection title="Objectifs du cours" sections={charge.descripteur.objectif} icon="solar:target-bold-duotone" />
              <DescriptorSection title="Méthodologie" sections={charge.descripteur.methodologie} icon="solar:programming-bold-duotone" />
              <DescriptorSection title="Plan du cours" sections={charge.descripteur.plan_cours} icon="solar:list-bold-duotone" />
              <DescriptorSection title="Modes d'évaluation" sections={charge.descripteur.mode_evaluation} icon="solar:clipboard-check-bold-duotone" />
              
              {charge.seances.length > 0 && (
                <section>
                  <SectionTitle title="Calendrier des séances" icon="solar:calendar-date-bold-duotone" />
                  <div className="mt-6 space-y-4">
                    {charge.seances.map((seance) => (
                      <div key={seance.id} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-primary/30 dark:border-slate-800 dark:bg-gray-900">
                        <div className="flex h-14 w-14 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                          <span className="text-xs font-bold uppercase">{seance.jour.slice(0, 3)}</span>
                          <ClientIcon icon="solar:clock-circle-bold-duotone" className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900 dark:text-white">{seance.title}</h4>
                          <p className="text-sm text-slate-500">
                            {seance.heureDebut} - {seance.heureFin} · {seance.salle}
                          </p>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${seance.status ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                          {seance.status ? 'Effectuée' : 'À venir'}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {charge.activites.length > 0 && (
                <section>
                  <SectionTitle title="Activités & Évaluations" icon="solar:bomb-emoji-bold-duotone" />
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    {charge.activites.map((act) => (
                      <Link 
                        key={act.id} 
                        href={`/product/${act.categorie}?productId=${act.id}`}
                        className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-primary/40 hover:shadow-lg dark:border-slate-800 dark:bg-gray-900"
                      >
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-secondary/10 px-3 py-1 text-[10px] font-black uppercase text-secondary">
                            {act.badge}
                          </span>
                          <ClientIcon icon="solar:arrow-right-up-bold-duotone" className="h-5 w-5 text-slate-300 transition group-hover:text-primary" />
                        </div>
                        <h4 className="mt-3 font-bold text-slate-900 dark:text-white group-hover:text-primary transition">{act.title}</h4>
                        <p className="mt-1 text-xs text-slate-500">{act.summary}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              {/* Teacher Card */}
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-gray-900">
                <div className="h-24 bg-primary" />
                <div className="relative px-6 pb-8">
                  <div className="absolute -top-12 left-6">
                    <div className="h-24 w-24 overflow-hidden rounded-2xl border-4 border-white bg-slate-100 shadow-md dark:border-gray-900">
                      <Image
                        src={charge.titulaire.photo || "/images/user.jpg"}
                        alt={charge.titulaire.name}
                        width={96}
                        height={96}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                  <div className="pt-14">
                    <p className="text-xs font-bold uppercase tracking-widest text-primary">Responsable du cours</p>
                    <h3 className="mt-1 text-xl font-black text-slate-900 dark:text-white">{charge.titulaire.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">Matricule: {charge.titulaire.matricule}</p>
                    
                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <ClientIcon icon="solar:letter-bold-duotone" className="h-5 w-5 text-primary" />
                        <span className="truncate">{charge.titulaire.email}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <ClientIcon icon="solar:phone-bold-duotone" className="h-5 w-5 text-primary" />
                        <span>{charge.titulaire.telephone}</span>
                      </div>
                      <div className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-400">
                        <ClientIcon icon="solar:calendar-add-bold-duotone" className="h-5 w-5 text-primary" />
                        <span>{charge.titulaire.disponibilite}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Course Meta */}
              <div className="rounded-3xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-gray-900/50">
                <h3 className="font-bold text-slate-900 dark:text-white">Informations clés</h3>
                <dl className="mt-4 space-y-4">
                  <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <dt className="text-sm text-slate-500">Statut</dt>
                    <dd className="text-sm font-bold text-primary uppercase">{charge.status}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <dt className="text-sm text-slate-500">Référence</dt>
                    <dd className="text-sm font-mono font-medium text-slate-900 dark:text-white">{charge.matiere.reference}</dd>
                  </div>
                  <div className="flex justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
                    <dt className="text-sm text-slate-500">Horaire principal</dt>
                    <dd className="text-sm font-medium text-slate-900 dark:text-white">{charge.horaire.jour} à {charge.horaire.heure_debut}</dd>
                  </div>
                </dl>
                
                <Link 
                  href={`/etudes/${charge.promotion.reference}`}
                  className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-black dark:bg-primary dark:hover:bg-darkprimary"
                >
                  <ClientIcon icon="solar:users-group-rounded-bold-duotone" className="h-5 w-5" />
                  Voir la promotion
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function SectionTitle({ title, icon }: { title: string; icon: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white">
        <ClientIcon icon={icon} className="h-6 w-6" />
      </div>
      <h2 className="text-2xl font-black text-slate-900 dark:text-white">{title}</h2>
    </div>
  );
}

function DescriptorSection({ title, sections, icon }: { title: string; sections: ChargeDescriptorSection[]; icon: string }) {
  if (!sections || sections.length === 0) return null;
  return (
    <section>
      <SectionTitle title={title} icon={icon} />
      <div className="mt-6 space-y-6">
        {sections.map((s, idx) => (
          <div key={idx}>
            <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200">{s.title}</h4>
            <ul className="mt-3 list-inside list-disc space-y-2 text-slate-600 dark:text-slate-400">
              {s.contenu.map((line, lidx) => (
                <li key={lidx} className="pl-2 leading-relaxed">{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
