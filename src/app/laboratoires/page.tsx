import Breadcrumb from "@/components/Breadcrumb";
import { listLaboratoiresPublic } from "@/actions/laboratoireActions";
import Link from "next/link";
import { Icon } from "@iconify/react";

export const metadata = {
  title: "Laboratoires | INBTP",
  description: "Découvrez nos laboratoires de recherche et d'enseignement.",
};

export default async function LaboratoiresPage() {
  const laboratoires = await listLaboratoiresPublic();

  return (
    <>
      <section className="relative z-10 overflow-hidden pt-28 pb-16 md:pt-32 lg:pt-40 lg:pb-24">
        <div className="container">
          <div className="-mx-4 flex flex-wrap">
            <div className="w-full px-4">
              <Breadcrumb
                links={[
                  { href: "/", text: "Accueil" },
                  { href: "/laboratoires", text: "Laboratoires" },
                ]}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="pb-16 lg:pb-24">
        <div className="container">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {laboratoires.map((labo: any) => (
              <Link
                key={labo.slug}
                href={`/laboratoires/${labo.slug}`}
                className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition-all hover:shadow-md dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-white">
                  <Icon icon="solar:flask-bold-duotone" className="h-8 w-8" />
                </div>
                <h3 className="mb-3 text-xl font-bold text-midnight_text dark:text-white group-hover:text-primary">
                  {labo.nom}
                </h3>
                <p className="text-sm text-body-color dark:text-gray-400">
                  Accédez aux équipements, manipulations et projets de recherche du {labo.nom}.
                </p>
                <div className="mt-6 flex items-center gap-2 text-sm font-bold text-primary">
                  Explorer
                  <Icon icon="solar:arrow-right-linear" className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
          {laboratoires.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-lg text-gray-500">Aucun laboratoire n'est encore répertorié.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
