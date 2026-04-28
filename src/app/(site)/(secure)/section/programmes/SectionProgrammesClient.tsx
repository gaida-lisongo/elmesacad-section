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

type SectionBureauRow = { _id: string; designation: string; slug: string; cycle: string };

type DescriptionItem = { title: string; contenu: string };

type MatiereRow = {
  _id: string;
  designation: string;
  credits?: number;
  code?: string;
  description?: DescriptionItem[];
};

type UniteRow = {
  _id: string;
  designation: string;
  credits?: number;
  code?: string;
  description?: DescriptionItem[];
  matieres?: MatiereRow[];
};

type FiliereRow = {
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

type ProgrammeRow = {
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

type DraftSemestre = {
  key: string;
  pick: SemestreCatalogPick | null;
};

type EditSemestreRow = {
  _id: string;
  designation: string;
  credits?: number;
  filiere?: FiliereRow | null;
  unites?: UniteRow[];
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
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [designation, setDesignation] = useState("");
  const [creditsStr, setCreditsStr] = useState("180");
  const [descriptionBlocs, setDescriptionBlocs] = useState<DescriptionBloc[]>([]);
  const [draftSemestres, setDraftSemestres] = useState<DraftSemestre[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [editingProgrammeId, setEditingProgrammeId] = useState<string | null>(null);
  const [editDesignation, setEditDesignation] = useState("");
  const [editCreditsStr, setEditCreditsStr] = useState("");
  const [editTab, setEditTab] = useState<"info" | "semestres">("info");
  const [newSemPick, setNewSemPick] = useState<SemestreCatalogPick | null>(null);
  const [semSubmitBusy, setSemSubmitBusy] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const recapDescription = useMemo(() => parseDescriptionForSave(descriptionBlocs), [descriptionBlocs]);

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
    setStep(1);
    setFormError(null);
    setDesignation("");
    setCreditsStr("180");
    setDescriptionBlocs([]);
    setDraftSemestres([{ key: newKey(), pick: null }]);
  }

  function closeModal() {
    if (submitting) return;
    setModalOpen(false);
  }

  function openEditModal(p: ProgrammeRow) {
    setEditingProgrammeId(p._id);
    setEditDesignation(p.designation);
    setEditCreditsStr(String(p.credits));
    setEditTab("info");
    setNewSemPick(null);
    setEditError(null);
    setEditOpen(true);
  }

  function closeEditModal() {
    if (editSubmitting) return;
    setEditOpen(false);
    setEditingProgrammeId(null);
    setEditError(null);
  }

  function validateStep1(): string | null {
    if (!designation.trim()) return "Indiquez la désignation du programme.";
    const c = Number(creditsStr);
    if (!Number.isFinite(c) || c < 0) return "Crédits invalides.";
    const d = parseDescriptionForSave(descriptionBlocs);
    if (!d.ok) return d.message;
    return null;
  }

  function validateStep2(): string | null {
    if (!draftSemestres.length) return "Ajoutez au moins un semestre.";
    const seen = new Set<string>();
    for (const s of draftSemestres) {
      if (!s.pick) return "Sélectionnez un semestre existant pour chaque ligne.";
      if (seen.has(s.pick.id)) {
        return `Semestre en double: « ${s.pick.designation} ».`;
      }
      seen.add(s.pick.id);
    }
    return null;
  }

  async function confirmCreate() {
    if (!activeId) return;
    const e1 = validateStep1();
    if (e1) {
      setFormError(e1);
      setStep(1);
      return;
    }
    const e2 = validateStep2();
    if (e2) {
      setFormError(e2);
      setStep(2);
      return;
    }
    const descParsed = parseDescriptionForSave(descriptionBlocs);
    if (!descParsed.ok) return;

    setSubmitting(true);
    setFormError(null);
    try {
      const credits = Number(creditsStr);
      const resP = await fetch(`/api/sections/${activeId}/programmes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: designation.trim(),
          credits,
          description: descParsed.value,
        }),
      });
      const jsonP = await resP.json().catch(() => ({}));
      if (!resP.ok) {
        setFormError((jsonP.message as string) || "Création du programme impossible.");
        setSubmitting(false);
        return;
      }
      const programmeId = jsonP.data?._id as string | undefined;
      if (!programmeId) {
        setFormError("Réponse serveur inattendue.");
        setSubmitting(false);
        return;
      }

      for (const s of draftSemestres) {
        if (!s.pick?.id) continue;
        const resS = await fetch(`/api/sections/${activeId}/programmes/${programmeId}/semestres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            semestreId: s.pick.id,
          }),
        });
        if (!resS.ok) {
          const js = await resS.json().catch(() => ({}));
          setFormError((js.message as string) || "Erreur lors de l’association d’un semestre.");
          setSubmitting(false);
          return;
        }
      }

      setModalOpen(false);
      await loadProgrammes(activeId);
    } catch {
      setFormError("Erreur réseau.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submitEdit() {
    if (!activeId || !editingProgrammeId) return;
    if (!editDesignation.trim()) {
      setEditError("Indiquez la désignation du programme.");
      return;
    }
    const c = Number(editCreditsStr);
    if (!Number.isFinite(c) || c < 0) {
      setEditError("Crédits invalides.");
      return;
    }

    setEditSubmitting(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/sections/${activeId}/programmes/${editingProgrammeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: editDesignation.trim(),
          credits: c,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError((json.message as string) || "Modification impossible.");
        return;
      }
      setEditOpen(false);
      setEditingProgrammeId(null);
      await loadProgrammes(activeId);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function addSemestreToProgramme() {
    if (!activeId || !editingProgrammeId) return;
    if (!newSemPick) {
      setEditError("Sélectionnez un semestre via la recherche filière.");
      return;
    }
    setSemSubmitBusy(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/sections/${activeId}/programmes/${editingProgrammeId}/semestres`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semestreId: newSemPick.id,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError((json.message as string) || "Ajout du semestre impossible.");
        return;
      }
      setNewSemPick(null);
      await loadProgrammes(activeId);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setSemSubmitBusy(false);
    }
  }

  async function removeSemestre(semestreId: string) {
    if (!activeId || !editingProgrammeId) return;
    if (!window.confirm("Supprimer ce semestre ?")) return;
    setSemSubmitBusy(true);
    setEditError(null);
    try {
      const res = await fetch(
        `/api/sections/${activeId}/programmes/${editingProgrammeId}/semestres/${semestreId}`,
        { method: "DELETE" }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setEditError((json.message as string) || "Suppression du semestre impossible.");
        return;
      }
      await loadProgrammes(activeId);
    } catch {
      setEditError("Erreur réseau.");
    } finally {
      setSemSubmitBusy(false);
    }
  }

  const editingProgrammeSemestres = useMemo(() => {
    if (!editingProgrammeId) return [];
    const semestres = programmes.find((p) => p._id === editingProgrammeId)?.semestres ?? [];
    return semestres as EditSemestreRow[];
  }, [programmes, editingProgrammeId]);

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
          className="mt-4 inline-block text-sm font-medium text-[#082b1c] underline dark:text-[#5ec998]"
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
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Programmes de section</h1>
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
            className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-[#082b1c]/30 disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900 dark:focus:ring-[#5ec998]/30"
          >
            Nouveau programme
          </button>
        }
        sidebar={
          <div className="space-y-4">
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Section active
              </h2>
              <p className="mt-2 text-sm font-medium text-midnight_text dark:text-white">
                {activeSection?.designation}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{activeSection?.cycle}</p>
              {activeSection ? (
                <Link
                  href={`/sections/${encodeURIComponent(activeSection.slug)}`}
                  className="mt-2 inline-block text-xs text-[#082b1c] underline dark:text-[#5ec998]"
                >
                  Fiche section
                </Link>
              ) : null}
            </div>
            {sections.length > 1 ? (
              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Autres sections
                </h2>
                <ul className="mt-2 space-y-1">
                  {sections
                    .filter((s) => s._id !== activeId)
                    .map((s) => (
                      <li key={s._id}>
                        <button
                          type="button"
                          onClick={() => setActiveId(s._id)}
                          className="w-full rounded-md px-2 py-1.5 text-left text-sm text-midnight_text hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                        >
                          {s.designation}
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ) : null}
          </div>
        }
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
                meta={`${p.credits} crédits · ${p.semestres?.length ?? 0} semestre(s) · slug : ${p.slug}`}
              >
                <div className="rounded-xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:from-gray-900 dark:to-gray-900/60">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Programme rattaché à <strong>{activeSection?.designation}</strong>.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {p.credits} crédits
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {p.semestres?.length ?? 0} semestre(s)
                    </span>
                    <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
                      {p.slug}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(p)}
                    className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-gray-600"
                  >
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteProgramme(p._id)}
                    className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-red-800 dark:text-red-300"
                  >
                    Supprimer
                  </button>
                </div>
              </PageListeCategoryCard>
            ))}
          </div>
        )}
      </PageListe>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <header className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-midnight_text dark:text-white">Nouveau programme</h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Étape {step} sur 3 — {step === 1 ? "Définition" : step === 2 ? "Semestres" : "Confirmation"}
              </p>
              {activeSection ? (
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Section : <strong>{activeSection.designation}</strong>
                </p>
              ) : null}
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
              {formError ? (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                  {formError}
                </div>
              ) : null}
              {step === 1 ? (
                <div className="space-y-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Désignation
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      placeholder="ex. Ingénieur civil"
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Crédits (total du programme)
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={creditsStr}
                      onChange={(e) => setCreditsStr(e.target.value)}
                    />
                  </label>
                  <DescriptionBlocsEditor
                    label="Description du programme"
                    hint="Ajoutez une ou plusieurs rubriques (titre + texte)."
                    items={descriptionBlocs}
                    onChange={setDescriptionBlocs}
                  />
                </div>
              ) : null}
              {step === 2 ? (
                <div className="space-y-4">
                  <div className="flex justify-between gap-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Association de semestres existants uniquement. Recherchez via le <strong>slug</strong> ou la{" "}
                      <strong>désignation</strong> d’une <strong>filière</strong>, puis sélectionnez le semestre à lier.
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftSemestres((prev) => [
                          ...prev,
                          { key: newKey(), pick: null },
                        ])
                      }
                      className="shrink-0 rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
                    >
                      + Semestre
                    </button>
                  </div>
                  <ul className="space-y-4">
                    {draftSemestres.map((s, idx) => (
                      <li key={s.key} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-medium text-gray-500">Semestre {idx + 1}</span>
                          <div className="flex flex-wrap gap-2">
                            {idx > 0 ? (
                              <button
                                type="button"
                                className="text-xs text-gray-600 underline dark:text-gray-400"
                                onClick={() =>
                                  setDraftSemestres((prev) => {
                                    const next = [...prev];
                                    [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
                                    return next;
                                  })
                                }
                              >
                                Monter
                              </button>
                            ) : null}
                            {idx < draftSemestres.length - 1 ? (
                              <button
                                type="button"
                                className="text-xs text-gray-600 underline dark:text-gray-400"
                                onClick={() =>
                                  setDraftSemestres((prev) => {
                                    const next = [...prev];
                                    [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
                                    return next;
                                  })
                                }
                              >
                                Descendre
                              </button>
                            ) : null}
                            {draftSemestres.length > 1 ? (
                              <button
                                type="button"
                                className="text-xs text-red-600 underline dark:text-red-400"
                                onClick={() => setDraftSemestres((prev) => prev.filter((x) => x.key !== s.key))}
                              >
                                Retirer
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <div className="mt-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                            Semestre existant depuis une filière (slug ou désignation)
                          </span>
                          <div className="mt-1">
                            <SemestreCatalogSearch
                              key={`${s.key}-${activeId ?? "no-section"}`}
                              sectionId={activeId ?? ""}
                              disabled={!activeId}
                              aria-label={`Trouver un semestre par filière pour la ligne ${idx + 1}`}
                              placeholder="Ex. genie-civil ou Génie civil…"
                              onPick={(item: SemestreCatalogPick) =>
                                setDraftSemestres((prev) =>
                                  prev.map((x) =>
                                    x.key === s.key
                                      ? {
                                          ...x,
                                          pick: item,
                                        }
                                      : x
                                  )
                                )
                              }
                              clearOnSelect
                            />
                          </div>
                        </div>
                        {s.pick ? (
                          <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                            <p className="font-medium text-gray-700 dark:text-gray-200">{s.pick.designation}</p>
                            <p className="text-gray-500 dark:text-gray-400">Filière: {s.pick.filiereLabel}</p>
                            <p className="text-gray-500 dark:text-gray-400">
                              Crédits: {s.pick.credits != null ? s.pick.credits : "—"}
                            </p>
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Aucun semestre sélectionné.</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {step === 3 ? (
                <div className="space-y-4 text-sm">
                  <section>
                    <h3 className="font-semibold text-midnight_text dark:text-white">Programme</h3>
                    <p className="mt-1">
                      <strong>{designation.trim() || "—"}</strong> — {creditsStr} crédits
                    </p>
                    {recapDescription.ok && recapDescription.value.length > 0 ? (
                      <ul className="mt-2 list-inside list-disc text-gray-600 dark:text-gray-400">
                        {recapDescription.value.map((b, i) => (
                          <li key={i}>
                            {b.title}: {b.contenu.length > 80 ? `${b.contenu.slice(0, 80)}…` : b.contenu}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-1 text-gray-500">Pas de description.</p>
                    )}
                  </section>
                  <section>
                    <h3 className="font-semibold text-midnight_text dark:text-white">Semestres ({draftSemestres.length})</h3>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-gray-600 dark:text-gray-400">
                      {draftSemestres.map((s) => (
                        <li key={s.key}>
                          {s.pick?.designation || "—"}
                          {s.pick?.filiereLabel ? ` — ${s.pick.filiereLabel}` : ""}
                          {s.pick?.credits != null ? ` — ${s.pick.credits} cr.` : ""}
                        </li>
                      ))}
                    </ol>
                  </section>
                  <section className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/50">
                    <p className="font-medium text-midnight_text dark:text-white">Confirmation</p>
                    <p className="mt-1 text-gray-600 dark:text-gray-400">
                      Le programme sera créé pour la section <strong>{activeSection?.designation}</strong> avec les semestres
                      ci-dessus.
                    </p>
                  </section>
                </div>
              ) : null}
            </div>
            <footer className="flex flex-wrap justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
              >
                Annuler
              </button>
              {step > 1 ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setFormError(null);
                    setStep((st) => Math.max(1, st - 1));
                  }}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                >
                  Retour
                </button>
              ) : null}
              {step < 3 ? (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setFormError(null);
                    if (step === 1) {
                      const err = validateStep1();
                      if (err) {
                        setFormError(err);
                        return;
                      }
                    }
                    if (step === 2) {
                      const err = validateStep2();
                      if (err) {
                        setFormError(err);
                        return;
                      }
                    }
                    setStep((st) => st + 1);
                  }}
                  className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-medium text-white dark:bg-[#5ec998] dark:text-gray-900"
                >
                  Suivant
                </button>
              ) : (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmCreate}
                  className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-medium text-white dark:bg-[#5ec998] dark:text-gray-900"
                >
                  {submitting ? "Enregistrement…" : "Confirmer et créer"}
                </button>
              )}
            </footer>
          </div>
        </div>
      ) : null}

      {editOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
          <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-900">
            <header className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
              <h2 className="text-lg font-semibold text-midnight_text dark:text-white">Modifier le programme</h2>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditTab("info")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    editTab === "info"
                      ? "bg-[#082b1c] text-white dark:bg-[#5ec998] dark:text-gray-900"
                      : "border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Informations
                </button>
                <button
                  type="button"
                  onClick={() => setEditTab("semestres")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    editTab === "semestres"
                      ? "bg-[#082b1c] text-white dark:bg-[#5ec998] dark:text-gray-900"
                      : "border border-gray-300 dark:border-gray-600"
                  }`}
                >
                  Semestres
                </button>
              </div>
            </header>
            <div className="min-h-0 space-y-4 overflow-y-auto px-6 py-4">
              {editError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                  {editError}
                </div>
              ) : null}
              {editTab === "info" ? (
                <>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Désignation
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editDesignation}
                      onChange={(e) => setEditDesignation(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Crédits
                    <input
                      type="number"
                      min={0}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                      value={editCreditsStr}
                      onChange={(e) => setEditCreditsStr(e.target.value)}
                    />
                  </label>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/40">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Association d’un semestre existant (aucune création)
                    </p>
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Recherchez via le slug ou la désignation de filière, sélectionnez un semestre existant, puis
                      associez-le au programme.
                    </p>
                    <div className="mt-2">
                      <SemestreCatalogSearch
                        key={`edit-sem-search-${activeId ?? "no-section"}-${editingProgrammeId ?? "no-programme"}`}
                        sectionId={activeId ?? ""}
                        disabled={!activeId || !editingProgrammeId || semSubmitBusy}
                        aria-label="Trouver un semestre par filière pour ce programme"
                        placeholder="Ex. genie-civil ou Génie civil…"
                        onPick={(item) => setNewSemPick(item)}
                        clearOnSelect
                      />
                    </div>
                    {newSemPick ? (
                      <div className="mt-2 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-2 text-xs dark:border-gray-700 dark:bg-gray-800/60">
                        <p className="font-medium text-gray-700 dark:text-gray-200">{newSemPick.designation}</p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Filière: {newSemPick.filiereLabel} {newSemPick.filiereSlug ? `(${newSemPick.filiereSlug})` : ""}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400">
                          Crédits: {newSemPick.credits != null ? newSemPick.credits : "—"}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void addSemestreToProgramme()}
                        disabled={semSubmitBusy || !newSemPick}
                        className="rounded-md bg-[#082b1c] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md disabled:opacity-60 dark:bg-[#5ec998] dark:text-gray-900"
                      >
                        {semSubmitBusy ? "Association..." : "Associer ce semestre"}
                      </button>
                    </div>
                  </div>

                  {!editingProgrammeId ? (
                    <p className="text-sm text-gray-500">Veuillez sélectionner un programme</p>
                  ) : editingProgrammeSemestres.length === 0 ? (
                    <p className="text-sm text-gray-500">Aucun semestre associé à ce programme.</p>
                  ) : (
                    <ul className="space-y-3">
                      {editingProgrammeSemestres.map((s) => (
                        <li
                          key={s._id}
                          className="flex items-start justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900/40"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-midnight_text dark:text-white">{s.designation}</p>
                            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{s.credits ?? 0} cr.</p>
                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Filière: {s?.filiere?.designation ?? "—"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void removeSemestre(s._id)}
                            disabled={semSubmitBusy}
                            className="rounded-md border border-red-300 px-2 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-red-800 dark:text-red-300"
                          >
                            Supprimer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <footer className="flex justify-end gap-2 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
              <button
                type="button"
                onClick={closeEditModal}
                disabled={editSubmitting}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void submitEdit()}
                disabled={editSubmitting || editTab !== "info"}
                className="rounded-lg bg-[#082b1c] px-4 py-2 text-sm font-medium text-white dark:bg-[#5ec998] dark:text-gray-900"
              >
                {editSubmitting ? "Enregistrement…" : "Enregistrer les infos"}
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
