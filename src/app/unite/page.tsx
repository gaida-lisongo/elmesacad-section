import type { Metadata } from "next";
import Link from "next/link";
import { listPublicUnites } from "@/actions/publicUnites";
import Breadcrumb from "@/components/Common/Breadcrumb";

export const metadata: Metadata = {
  title: "Unités d'Enseignement | INBTP",
  description: "Liste des unités d'enseignement disponibles",
};

export default async function UnitesPage() {
  const unites = await listPublicUnites(50);

  return (
    <>
      <Breadcrumb
        pageName="Unités d'Enseignement"
        pageDescription="Explorez toutes les unités d'enseignement disponibles"
        trail={[{ label: "Études", href: "/etudes" }]}
      />

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white dark:bg-darklight rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Unités d&apos;Enseignement ({unites.length})
            </h2>
          </div>

          {unites.length === 0 ? (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              Aucune unité d&apos;enseignement trouvée
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {unites.map((unite) => (
                <Link
                  key={unite.id}
                  href={`/unite/${unite.id}`}
                  className="group block rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-primary dark:hover:border-primary transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {unite.code}
                      </span>
                      <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white group-hover:text-primary dark:group-hover:text-primary transition-colors">
                        {unite.designation}
                      </h3>
                      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {unite.credits} crédit{unite.credits > 1 ? "s" : ""} - {
                          unite.coursesCount
                        } matière{unite.coursesCount > 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
