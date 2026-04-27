import Link from "next/link";

type Props = { params: Promise<{ slug: string }> };

/**
 * Fiche filière (contenu métier à brancher : semestres, UE, etc.).
 * Route stable : `/filiere/[slug]`.
 */
export default async function FiliereBySlugPage({ params }: Props) {
  const { slug: raw } = await params;
  const slug = decodeURIComponent(raw);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-[#082b1c] hover:underline dark:text-[#5ec998]"
        >
          ← Tableau de bord
        </Link>
      </nav>
      <header className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Filière
        </p>
        <h1 className="mt-1 text-2xl font-bold text-midnight_text dark:text-white">{slug}</h1>
        <p className="mt-3 text-sm text-body-color dark:text-gray-400">
          Cette page accueillera bientôt la fiche complète (description, semestres, parcours). Le slug
          provient de l’URL.
        </p>
        <p className="mt-2 font-mono text-xs text-gray-500 dark:text-gray-500">/{slug}</p>
      </header>
    </div>
  );
}
