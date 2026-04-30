import type { Metadata } from "next";
import Link from "next/link";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { listPublicSections } from "@/actions/publicSections";

export const metadata: Metadata = {
  title: "Etudes | INBTP",
};

export default async function EtudesPage() {
  const sections = await listPublicSections();

  return (
    <>
      <Breadcrumb pageName="Etudes" pageDescription="Explorez toutes les sections academiques disponibles." />
      <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections.map((section) => (
            <Link
              key={section.id}
              href={`/etudes/${section.slug}`}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-darklight"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">{section.cycle}</p>
              <h2 className="mt-2 text-lg font-bold text-slate-900 dark:text-white">{section.name}</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {section.programmesCount} programme(s)
              </p>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
