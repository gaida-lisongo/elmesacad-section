import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicUniteById } from "@/actions/publicUnites";
import Breadcrumb from "@/components/Common/Breadcrumb";
import {
  UniteHeader,
  UniteMetrics,
  UniteRepartition,
  UniteMatieresAccordion,
} from "@/components/Unite";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const unite = await getPublicUniteById(id);

  return {
    title: `${unite?.code || "UE"} - ${unite?.designation || "Unité d\'enseignement"} | INBTP`,
    description: unite?.description || "Détails de l'unité d'enseignement",
  };
}

export default async function UniteDetailPage({ params }: Props) {
  const { id } = await params;
  const unite = await getPublicUniteById(id);

  if (!unite) {
    notFound();
  }

  return (
    <>
      <Breadcrumb
        pageName={unite.code}
        pageDescription={unite.designation}
        trail={[
          { label: "Études", href: "/etudes" },
          { label: "Unités d\'enseignement", href: "/unite" },
        ]}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* SECTION PRINCIPALE (2/3) */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-darklight rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
              <UniteHeader unite={unite} />
            </div>
          </div>

          {/* SECTION SECONDAIRE (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            {/* Métriques */}
            <UniteMetrics unite={unite} />

            {/* Répartition */}
            <UniteRepartition unite={unite} />

            {/* Matières avec accordéons */}
            <UniteMatieresAccordion matieres={unite.matieres} />
          </div>
        </div>
      </main>
    </>
  );
}
