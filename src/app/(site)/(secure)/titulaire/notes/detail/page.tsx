import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fiche de cotation - Détail | INBTP",
};

export default function TitulaireNotesDetailPage() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Fiche de cotation — détail</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
        PageDetail à implémenter à l'étape suivante. Le cache des parcours est déjà transmis via <code>cacheKey</code>.
      </p>
    </div>
  );
}

