import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { getPublicSectionBySlug } from "@/actions/publicSections";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const section = await getPublicSectionBySlug(slug);
  return {
    title: section ? `${section.name} | Etudes INBTP` : "Section | Etudes INBTP",
  };
}

export default async function EtudesSectionPage({ params }: Props) {
  const { slug } = await params;
  const section = await getPublicSectionBySlug(slug);

  if (!section) notFound();

  return (
    <>
      <Breadcrumb pageName={section.name} pageDescription="Presentation de la section academique." />
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-darklight">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{section.cycle}</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{section.name}</h1>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            {section.programmesCount} programme(s) rattache(s)
          </p>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Contact: {section.email}</p>

          <div className="mt-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
              Points forts
            </h2>
            <ul className="mt-3 space-y-2">
              {(section.descriptionTitles.length > 0
                ? section.descriptionTitles
                : ["Presentation de la section en cours de publication."]).map((item) => (
                <li
                  key={`${section.id}-${item}`}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6">
            <Link
              href="/etudes"
              className="inline-flex items-center rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkprimary"
            >
              Retour aux etudes
            </Link>
          </div>
        </article>
      </main>
    </>
  );
}
