"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PageManager from "@/components/secure/PageManager";
import { listParcoursForTitulaireWorkflow } from "@/actions/titulaireNotesWorkflow";
import { setTransientParcoursCache } from "@/lib/notes/transientParcoursCache";

type MatiereTab = {
  id: string;
  matiereDesignation: string;
  matiereReference: string;
  programmeRef: string;
  programmeDesignation: string;
  programmeSlug: string;
  sectionSlug: string;
  uniteCode: string;
  semestreDesignation: string;
};
type AnneeCard = { id: string; designation: string; slug: string; debut: number; fin: number; status: boolean };
type Props = { initialData: { matiereTabs: MatiereTab[]; annees: AnneeCard[] } };

export default function TitulaireNotesManagerClient({ initialData }: Props) {
  const router = useRouter();
  const [activeMatiereId, setActiveMatiereId] = useState(initialData.matiereTabs[0]?.id ?? "");
  const [searchYear, setSearchYear] = useState("");
  const [loadingAnneeId, setLoadingAnneeId] = useState<string | null>(null);

  const activeMatiere = useMemo(
    () => initialData.matiereTabs.find((x) => x.id === activeMatiereId) ?? null,
    [initialData.matiereTabs, activeMatiereId]
  );
  const filteredAnnees = useMemo(() => {
    const q = searchYear.trim().toLowerCase();
    if (!q) return initialData.annees;
    return initialData.annees.filter((a) => a.designation.toLowerCase().includes(q) || a.slug.toLowerCase().includes(q));
  }, [initialData.annees, searchYear]);

  async function openFicheForYear(annee: AnneeCard) {
    if (!activeMatiere) return;
    setLoadingAnneeId(annee.id);
    try {
      const parcours = await listParcoursForTitulaireWorkflow({
        anneeSlug: annee.slug,
        sectionSlug: activeMatiere.sectionSlug,
        programmeSlug: activeMatiere.programmeSlug,
      });
      const cacheKey = setTransientParcoursCache(parcours);
      const params = new URLSearchParams({
        anneeSlug: annee.slug,
        programmeRef: activeMatiere.programmeRef,
        matiereRef: activeMatiere.matiereReference,
        cacheKey,
      });
      router.push(`/titulaire/notes/detail?${params.toString()}`);
    } finally {
      setLoadingAnneeId(null);
    }
  }

  return (
    <PageManager<AnneeCard>
      title="Fiche de cotation"
      description="Choisissez la matière puis l'année pour ouvrir la fiche de cotation."
      items={filteredAnnees}
      tabs={initialData.matiereTabs.map((m) => ({ value: m.id, label: m.matiereDesignation || "Matière" }))}
      activeTab={activeMatiereId}
      onTabChange={setActiveMatiereId}
      searchText={searchYear}
      onSearchChange={setSearchYear}
      searchPlaceholder="Rechercher une année académique..."
      showCreateButton={false}
      CardCreate={() => null}
      CardItem={({ item }) => (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
          <p className="text-sm font-semibold text-midnight_text dark:text-white">
            {item.designation || `${item.debut}-${item.fin}`}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{item.slug}</p>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => void openFicheForYear(item)}
              disabled={!activeMatiere || loadingAnneeId === item.id}
              className="rounded-md bg-[#082b1c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
            >
              {loadingAnneeId === item.id ? "Chargement..." : "Fiche de cotation"}
            </button>
          </div>
        </div>
      )}
    />
  );
}

