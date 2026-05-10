"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { PageListe, PageListeCategoryCard } from "@/components/Layout/PageListe";
import {
  DescriptionBlocsEditor,
  parseDescriptionForSave,
  type DescriptionBloc,
} from "@/components/Layout/DescriptionBlocsEditor";
import { SemestreCatalogSearch } from "@/components/secure/SemestreCatalogSearch";
import type { SemestreCatalogPick } from "@/lib/semestre-search/fetchSemestreCatalogSearch";
import SidebarProgrammes from "./_components/Sidebar";
import ProgrammeItem from "./_components/ProgrammeItem";
import ProgrammeCreate from "./_components/ProgrammeCreate";
import ProgrammeEdit from "./_components/ProgrammeEdit";

export type SectionBureauRow = { _id: string; designation: string; slug: string; cycle: string };

export type DescriptionItem = { title: string; contenu: string };

type MatiereRow = {
  _id: string;
  designation: string;
  credits?: number;
  code?: string;
  description?: DescriptionItem[];
};

export type UniteRow = {
  _id: string;
  designation: string;
  credits?: number;
  code?: string;
  description?: DescriptionItem[];
  matieres?: MatiereRow[];
};

export type FiliereRow = {
  _id: string;
  designation?: string;
  slug?: string;
  description?: DescriptionItem[];
  semestres?: string[];
};

type SemestreRow = {
  _id: string;
  designation: string;
  credits?: number;
  order?: number;
  filiere?: FiliereRow | null;
  unites?: UniteRow[];
  description?: DescriptionItem[];
};

export type ProgrammeRow = {
  _id: string;
  section?: string;
  designation: string;
  slug: string;
  credits: number;
  description?: DescriptionItem[];
  semestres?: SemestreRow[];
  createdAt?: string;
  updatedAt?: string;
};

export type DraftSemestre = {
  key: string;
  pick: SemestreCatalogPick | null;
};


function newKey() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function SectionProgrammesClient({ isOrganisateur }: { isOrganisateur: boolean }) {
  const [sections, setSections] = useState<SectionBureauRow[]>([]);
  const [sectionsLoading, setSectionsLoading] = useState(isOrganisateur);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [programmes, setProgrammes] = useState<ProgrammeRow[]>([]);
  const [progLoading, setProgLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!isOrganisateur) {
      setSectionsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/my-sections/bureau");
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setSectionsError((json.message as string) || "Impossible de charger vos sections.");
          return;
        }
        const data = (json.data || []) as SectionBureauRow[];
        if (!cancelled) {
          setSections(data);
          setActiveId((prev) => {
            if (!data.length) return null;
            if (prev && data.some((s) => s._id === prev)) return prev;
            return data[0]._id;
          });
        }
      } catch {
        if (!cancelled) setSectionsError("Erreur réseau.");
      } finally {
        if (!cancelled) setSectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOrganisateur]);

  const loadProgrammes = useCallback(async (sectionId: string) => {
    setProgLoading(true);
    try {
      const res = await fetch(`/api/sections/${sectionId}/programmes`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setProgrammes([]);
        return;
      }

      setProgrammes((json.data || []) as ProgrammeRow[]);
    } finally {
      setProgLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadProgrammes(activeId);
  }, [activeId, loadProgrammes]);

  const activeSection = useMemo(
    () => sections.find((s) => s._id === activeId) || null,
    [sections, activeId]
  );

  const filteredProgrammes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return programmes;
    return programmes.filter(
      (p) => p.designation.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q)
    );
  }, [programmes, search]);

  function openModal() {
    setModalOpen(true);
  }

  function closeModal(submitting: boolean) {
    if (submitting) return;
    setModalOpen(false);
  }

  function openEditModal(p: ProgrammeRow) {
    setEditOpen(true);
  }

  function closeEditModal(submitting: boolean) {
    if (submitting) return;
    setEditOpen(false);
  }
  
  async function deleteProgramme(programmeId: string) {
    if (!activeId) return;
    if (!window.confirm("Supprimer ce programme ? Cela supprimera aussi ses semestres.")) return;

    try {
      const res = await fetch(`/api/sections/${activeId}/programmes/${programmeId}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        window.alert((json.message as string) || "Suppression impossible.");
        return;
      }
      await loadProgrammes(activeId);
    } catch {
      window.alert("Erreur réseau.");
    }
  }

  if (!isOrganisateur) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <h1 className="text-lg font-semibold">Programmes de section</h1>
        <p className="mt-2 text-sm">
          Cette fonctionnalité est réservée aux <strong>organisateurs</strong> qui siègent au bureau d’une section (chef de
          section, chargé d’enseignement ou chargé de recherche).
        </p>
      </div>
    );
  }

  if (sectionsLoading) {
    return <p className="text-sm text-gray-600 dark:text-gray-400">Chargement…</p>;
  }

  if (sectionsError) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50/80 p-6 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
        <p>{sectionsError}</p>
      </div>
    );
  }

  if (!sections.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900/50">
        <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Programmes de section</h1>
        <p className="mt-3 max-w-xl text-sm text-gray-600 dark:text-gray-400">
          Vous n’avez pas l’autorisation de gérer les programmes : aucune section ne vous associe comme chef de section,
          chargé d’enseignement ou chargé de recherche. Pour gérer les programmes, il faut d’abord être désigné sur l’un de
          ces rôles dans la fiche section.
        </p>
        <Link
          href="/sections"
          className="mt-4 inline-block text-sm font-medium text-primary underline dark:text-primary"
        >
          Voir les sections
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageListe
        heading={
          <div>
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Programmes de la section {activeSection?.designation}</h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Créez et consultez les programmes pour la section dont vous gérez le bureau.
            </p>
          </div>
        }
        toolbar={
          <button
            type="button"
            onClick={openModal}
            disabled={!activeSection}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 dark:bg-primary dark:text-gray-900 dark:focus:ring-primary/30"
          >
            Nouveau programme
          </button>
        }
        sidebar={<SidebarProgrammes activeSection={activeSection ?? {_id: "", designation: "", slug: "", cycle: ""}} sections={sections} activeId={activeId ?? ""} setActiveId={setActiveId} />}
        searchValue={search}
        onSearchChange={setSearch}
        placeholder="Rechercher un programme…"
      >
        {progLoading ? (
          <p className="text-sm text-gray-500">Chargement des programmes…</p>
        ) : filteredProgrammes.length === 0 ? (
          <p className="text-sm text-gray-500">
            {programmes.length === 0
              ? "Aucun programme pour cette section. Créez-en un avec « Nouveau programme »."
              : "Aucun résultat pour cette recherche."}
          </p>
        ) : (
          <div className="space-y-6">
            {filteredProgrammes.map((p) => (
              <PageListeCategoryCard
                key={p._id}
                title={p.designation}
                meta={`${p.credits} crédits · ${p.semestres?.length ?? 0} semestre(s)`}
              >
                <ProgrammeItem activeSection={activeSection ?? {_id: "", designation: "", slug: "", cycle: ""}} p={p} openEditModal={openEditModal} deleteProgramme={deleteProgramme} />
              </PageListeCategoryCard>
            ))}
          </div>
        )}
      </PageListe>

      {modalOpen ? (
        <ProgrammeCreate 
          activeSection={activeSection ?? {_id: "", designation: "", slug: "", cycle: ""}} 
          activeId={activeId ?? null} 
          closeModal={closeModal} 
          newKey={newKey} 
          loadProgrammes={loadProgrammes} 
        />
        // <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
        //   <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
        //     <header className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        //       <h2 className="text-lg font-semibold text-midnight_text dark:text-white">Nouveau programme</h2>
        //       <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        //         Étape {step} sur 3 — {step === 1 ? "Définition" : step === 2 ? "Semestres" : "Confirmation"}
        //       </p>
        //       {activeSection ? (
        //         <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
        //           Section : <strong>{activeSection.designation}</strong>
        //         </p>
        //       ) : null}
        //     </header>
        //     <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
        //       {formError ? (
        //         <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
        //           {formError}
        //         </div>
        //       ) : null}
        //       {step === 1 ? (
        //         <div className="space-y-4">
        //           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        //             Désignation
        //             <input
        //               className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        //               value={designation}
        //               onChange={(e) => setDesignation(e.target.value)}
        //               placeholder="ex. Ingénieur civil"
        //             />
        //           </label>
        //           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
        //             Crédits (total du programme)
        //             <input
        //               type="number"
        //               min={0}
        //               className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
        //               value={creditsStr}
        //               onChange={(e) => setCreditsStr(e.target.value)}
        //             />
        //           </label>
        //           <DescriptionBlocsEditor
        //             label="Description du programme"
        //             hint="Ajoutez une ou plusieurs rubriques (titre + texte)."
        //             items={descriptionBlocs}
        //             onChange={setDescriptionBlocs}
        //           />
        //         </div>
        //       ) : null}
        //       {step === 2 ? (
        //         <div className="space-y-4">
        //           <div className="flex justify-between gap-2">
        //             <p className="text-sm text-gray-600 dark:text-gray-400">
        //               Association de semestres existants uniquement. Recherchez via le <strong>slug</strong> ou la{" "}
        //               <strong>désignation</strong> d’une <strong>filière</strong>, puis sélectionnez le semestre à lier.
        //             </p>
        //             <button
        //               type="button"
        //               onClick={() =>
        //                 setDraftSemestres((prev) => [
        //                   ...prev,
        //                   { key: newKey(), pick: null },
        //                 ])
        //               }
        //               className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
        //             >
        //               + Semestre
        //             </button>
        //           </div>
        //           <ul className="space-y-4">
        //             {draftSemestres.map((s, idx) => (
        //               <li key={s.key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        //                 <div className="flex flex-wrap items-center justify-between gap-2">
        //                   <span className="text-xs font-medium text-gray-500">Semestre {idx + 1}</span>
        //                   <div className="flex flex-wrap gap-2">
        //                     {idx > 0 ? (
        //                       <button
        //                         type="button"
        //                         className="text-xs text-gray-600 underline dark:text-gray-400"
        //                         onClick={() =>
        //                           setDraftSemestres((prev) => {
        //                             const next = [...prev];
        //                             [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        //                             return next;
        //                           })
        //                         }
        //                       >
        //                         Monter
        //                       </button>
        //                     ) : null}
        //                     {idx < draftSemestres.length - 1 ? (
        //                       <button
        //                         type="button"
        //                         className="text-xs text-gray-600 underline dark:text-gray-400"
        //                         onClick={() =>
        //                           setDraftSemestres((prev) => {
        //                             const next = [...prev];
        //                             [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        //                             return next;
        //                           })
        //                         }
        //                       >
        //                         Descendre
        //                       </button>
        //                     ) : null}
        //                     {draftSemestres.length > 1 ? (
        //                       <button
        //                         type="button"
        //                         className="text-xs text-red-600 underline dark:text-red-400"
        //                         onClick={() => setDraftSemestres((prev) => prev.filter((x) => x.key !== s.key))}
        //                       >
        //                         Retirer
        //                       </button>
        //                     ) : null}
        //                   </div>
        //                 </div>
        //                 <div className="mt-2">
        //                   <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
        //                     Semestre existant depuis une filière (slug ou désignation)
        //                   </span>
        //                   <div className="mt-1">
        //                     <SemestreCatalogSearch
        //                       key={`${s.key}-${activeId ?? "no-section"}`}
        //                       sectionId={activeId ?? ""}
        //                       disabled={!activeId}
        //                       aria-label={`Trouver un semestre par filière pour la ligne ${idx + 1}`}
        //                       placeholder="Ex. genie-civil ou Génie civil…"
        //                       onPick={(item: SemestreCatalogPick) =>
        //                         setDraftSemestres((prev) =>
        //                           prev.map((x) =>
        //                             x.key === s.key
        //                               ? {
        //                                   ...x,
        //                                   pick: item,
        //                                 }
        //                               : x
        //                           )
        //                         )
        //                       }
        //                       clearOnSelect
        //                     />
        //                   </div>
        //                 </div>
        //                 {s.pick ? (
        //                   <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60">
        //                     <p className="font-medium text-gray-700 dark:text-gray-200">{s.pick.designation}</p>
        //                     <p className="text-gray-500 dark:text-gray-400">Filière: {s.pick.filiereLabel}</p>
        //                     <p className="text-gray-500 dark:text-gray-400">
        //                       Crédits: {s.pick.credits != null ? s.pick.credits : "—"}
        //                     </p>
        //                   </div>
        //                 ) : (
        //                   <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Aucun semestre sélectionné.</p>
        //                 )}
        //               </li>
        //             ))}
        //           </ul>
        //         </div>
        //       ) : null}
        //       {step === 3 ? (
        //         <div className="space-y-4 text-sm">
        //           <section>
        //             <h3 className="font-semibold text-midnight_text dark:text-white">Programme</h3>
        //             <p className="mt-1">
        //               <strong>{designation.trim() || "—"}</strong> — {creditsStr} crédits
        //             </p>
        //             {recapDescription.ok && recapDescription.value.length > 0 ? (
        //               <ul className="mt-2 list-inside list-disc text-gray-600 dark:text-gray-400">
        //                 {recapDescription.value.map((b, i) => (
        //                   <li key={i}>
        //                     {b.title}: {b.contenu.length > 80 ? `${b.contenu.slice(0, 80)}…` : b.contenu}
        //                   </li>
        //                 ))}
        //               </ul>
        //             ) : (
        //               <p className="mt-1 text-gray-500">Pas de description.</p>
        //             )}
        //           </section>
        //           <section>
        //             <h3 className="font-semibold text-midnight_text dark:text-white">Semestres ({draftSemestres.length})</h3>
        //             <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-600 dark:text-gray-400">
        //               {draftSemestres.map((s) => (
        //                 <li key={s.key}>
        //                   {s.pick?.designation || "—"}
        //                   {s.pick?.filiereLabel ? ` — ${s.pick.filiereLabel}` : ""}
        //                   {s.pick?.credits != null ? ` — ${s.pick.credits} cr.` : ""}
        //                 </li>
        //               ))}
        //             </ol>
        //           </section>
        //           <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
        //             <p className="font-medium text-midnight_text dark:text-white">Confirmation</p>
        //             <p className="mt-1 text-gray-600 dark:text-gray-400">
        //               Le programme sera créé pour la section <strong>{activeSection?.designation}</strong> avec les semestres
        //               ci-dessus.
        //             </p>
        //           </section>
        //         </div>
        //       ) : null}
        //     </div>
        //     <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
        //       <button
        //         type="button"
        //         onClick={closeModal}
        //         disabled={submitting}
        //         className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
        //       >
        //         Annuler
        //       </button>
        //       {step > 1 ? (
        //         <button
        //           type="button"
        //           disabled={submitting}
        //           onClick={() => {
        //             setFormError(null);
        //             setStep((st) => Math.max(1, st - 1));
        //           }}
        //           className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
        //         >
        //           Retour
        //         </button>
        //       ) : null}
        //       {step < 3 ? (
        //         <button
        //           type="button"
        //           disabled={submitting}
        //           onClick={() => {
        //             setFormError(null);
        //             if (step === 1) {
        //               const err = validateStep1();
        //               if (err) {
        //                 setFormError(err);
        //                 return;
        //               }
        //             }
        //             if (step === 2) {
        //               const err = validateStep2();
        //               if (err) {
        //                 setFormError(err);
        //                 return;
        //               }
        //             }
        //             setStep((st) => st + 1);
        //           }}
        //           className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
        //         >
        //           Suivant
        //         </button>
        //       ) : (
        //         <button
        //           type="button"
        //           disabled={submitting}
        //           onClick={confirmCreate}
        //           className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white dark:bg-primary dark:text-gray-900"
        //         >
        //           {submitting ? "Enregistrement…" : "Confirmer et créer"}
        //         </button>
        //       )}
        //     </footer>
        //   </div>
        // </div>
      ) : null}

      {editOpen ? <ProgrammeEdit 
        activeId={activeId ?? null} 
        programmes={programmes} 
        loadProgrammes={loadProgrammes} 
        closeEditModal={closeEditModal} 
      /> : null}
    </>
  );
}
