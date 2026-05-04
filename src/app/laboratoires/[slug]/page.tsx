import { getLaboratoireBySlug } from "@/actions/laboratoireActions";
import { connectDB } from "@/lib/services/connectedDB";
import { EquipementModel } from "@/lib/models/Equipement";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Breadcrumb";
import { Icon } from "@iconify/react";
import EquipmentCard from "@/components/laboratoire/EquipmentCard";
import Image from "next/image";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const labo = await getLaboratoireBySlug(slug);
  return {
    title: labo ? `${labo.nom} | INBTP` : "Laboratoire | INBTP",
  };
}

export default async function LaboratoirePublicDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  
  await connectDB();
  const labo = await getLaboratoireBySlug(slug);
  
  if (!labo) {
    notFound();
  }

  const equipments = await EquipementModel.find({ laboratoire: labo._id }).lean();

  return (
    <>
      <section className="relative z-10 overflow-hidden pt-28 pb-12 md:pt-32 lg:pt-40">
        <div className="container">
          <Breadcrumb
            links={[
              { href: "/", text: "Accueil" },
              { href: "/laboratoires", text: "Laboratoires" },
              { href: "#", text: labo.nom },
            ]}
          />
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white sm:text-4xl">
                {labo.nom}
              </h1>
              <p className="mt-4 text-lg text-body-color dark:text-gray-400">
                Découvrez les installations et l'expertise technique de notre {labo.nom.toLowerCase()}.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 lg:pb-24">
        <div className="container">
          <div className="grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-12">
              {/* Départements */}
              <div className="space-y-8">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
                  <Icon icon="solar:structure-bold-duotone" className="text-primary" />
                  Départements & Spécialités
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {labo.departements.map((dept: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-6 dark:border-gray-800 dark:bg-gray-800/50">
                      <h3 className="mb-4 text-lg font-bold text-primary">{dept.designation}</h3>
                      <div className="space-y-4">
                        {dept.description.map((desc: any, j: number) => (
                          <div key={j}>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">{desc.title}</h4>
                            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-gray-600 dark:text-gray-400">
                              {desc.contenu.map((item: string, k: number) => (
                                <li key={k}>{item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Équipements */}
              <div className="space-y-8">
                <h2 className="flex items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
                  <Icon icon="solar:box-bold-duotone" className="text-primary" />
                  Équipements de pointe
                </h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  {equipments.map((equip: any) => (
                    <EquipmentCard key={equip._id} equipement={JSON.parse(JSON.stringify(equip))} />
                  ))}
                </div>
                {equipments.length === 0 && (
                  <p className="text-gray-500">Aucun équipement n'est encore affiché pour ce laboratoire.</p>
                )}
              </div>
            </div>

            <div className="space-y-8">
              {/* Techniciens / Contact */}
              <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h3 className="mb-6 text-xl font-bold text-midnight_text dark:text-white">Responsables</h3>
                <div className="space-y-6">
                  {labo.techniciens.map((tech: any, i: number) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className="relative h-12 w-12 overflow-hidden rounded-full ring-2 ring-primary/10">
                        <Image
                          src={tech.agent.photo || "/images/user.jpg"}
                          alt={tech.agent.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-midnight_text dark:text-white">{tech.agent.name}</p>
                        <p className="text-xs font-medium uppercase text-primary">{tech.fonction}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-8 pt-8 border-t border-gray-100 dark:border-gray-800">
                  <p className="text-sm text-body-color dark:text-gray-400">
                    Pour toute demande d'analyse ou de collaboration, veuillez contacter le secrétariat de l'INBTP.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
