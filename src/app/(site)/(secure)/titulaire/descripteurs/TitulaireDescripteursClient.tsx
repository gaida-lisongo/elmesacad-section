"use client";

import { useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  saveChargeDescripteur,
  type ChargeDescriptorItem,
  type DescriptorKey,
  type DescriptorPayload,
  type DescriptorSection,
} from "@/actions/titulaireDescripteurs";

type Props = { initialData: { charges: ChargeDescriptorItem[] } };
type DescriptorCard = { id: DescriptorKey; keyName: DescriptorKey; title: string; description: string; sections: DescriptorSection[] };

const DESCRIPTOR_META: Record<DescriptorKey, { title: string; description: string }> = {
  objectif: {
    title: "Objectifs",
    description: "Définit les compétences et acquis visés par le cours.",
  },
  methodologie: {
    title: "Méthodologie",
    description: "Décrit l'approche pédagogique et la conduite des séances.",
  },
  mode_evaluation: {
    title: "Mode d'évaluation",
    description: "Précise les modalités d'évaluation prévues pendant le cours.",
  },
  penalties: {
    title: "Pénalités",
    description: "Spécifie les règles de pénalité et les cas de sanction académique.",
  },
  ressources: {
    title: "Ressources",
    description: "Références bibliographiques et supports recommandés pour l'enseignement.",
  },
  plan_cours: {
    title: "Plan du cours",
    description: "Structure les chapitres du cours et les points détaillés de chaque chapitre.",
  },
};

const KEYS: DescriptorKey[] = ["objectif", "methodologie", "mode_evaluation", "penalties", "ressources", "plan_cours"];

function emptyDescriptor(): DescriptorPayload {
  return {
    objectif: [],
    methodologie: [],
    mode_evaluation: [],
    penalties: [],
    ressources: [],
    plan_cours: [],
  };
}

export default function TitulaireDescripteursClient({ initialData }: Props) {
  const [activeChargeId, setActiveChargeId] = useState(initialData.charges[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [editingKey, setEditingKey] = useState<DescriptorKey | null>(null);
  const [draft, setDraft] = useState<DescriptorPayload>(emptyDescriptor());
  const [selectedSectionIndex, setSelectedSectionIndex] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeCharge = useMemo(
    () => initialData.charges.find((x) => x.id === activeChargeId) ?? null,
    [initialData.charges, activeChargeId]
  );
  const cards = useMemo<DescriptorCard[]>(() => {
    const d = activeCharge?.descripteur ?? emptyDescriptor();
    return KEYS.map((key) => ({
      id: key,
      keyName: key,
      title: DESCRIPTOR_META[key].title,
      description: DESCRIPTOR_META[key].description,
      sections: d[key] ?? [],
    }));
  }, [activeCharge]);
  const filteredCards = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) => c.title.toLowerCase().includes(q) || c.description.toLowerCase().includes(q));
  }, [cards, search]);

  function openEditor(key: DescriptorKey) {
    const current = activeCharge?.descripteur ?? emptyDescriptor();
    setDraft(JSON.parse(JSON.stringify(current)) as DescriptorPayload);
    setEditingKey(key);
    setSelectedSectionIndex(0);
    setError(null);
    setMessage(null);
  }

  function updateSectionTitle(idx: number, value: string) {
    if (!editingKey) return;
    setDraft((prev) => {
      const next = { ...prev, [editingKey]: [...prev[editingKey]] };
      next[editingKey][idx] = { ...next[editingKey][idx], title: value };
      return next;
    });
  }

  function addSection() {
    if (!editingKey) return;
    setDraft((prev) => {
      const next = { ...prev, [editingKey]: [...prev[editingKey], { title: "", contenu: [] }] };
      return next;
    });
    setSelectedSectionIndex(draft[editingKey]?.length ?? 0);
  }

  function removeSection(idx: number) {
    if (!editingKey) return;
    setDraft((prev) => {
      const nextList = prev[editingKey].filter((_, i) => i !== idx);
      return { ...prev, [editingKey]: nextList };
    });
    setSelectedSectionIndex(0);
  }

  function addContenuLine() {
    if (!editingKey) return;
    const idx = selectedSectionIndex;
    setDraft((prev) => {
      const sections = [...prev[editingKey]];
      if (!sections[idx]) return prev;
      sections[idx] = { ...sections[idx], contenu: [...sections[idx].contenu, ""] };
      return { ...prev, [editingKey]: sections };
    });
  }

  function updateContenuLine(lineIdx: number, value: string) {
    if (!editingKey) return;
    const idx = selectedSectionIndex;
    setDraft((prev) => {
      const sections = [...prev[editingKey]];
      if (!sections[idx]) return prev;
      const contenu = [...sections[idx].contenu];
      contenu[lineIdx] = value;
      sections[idx] = { ...sections[idx], contenu };
      return { ...prev, [editingKey]: sections };
    });
  }

  function removeContenuLine(lineIdx: number) {
    if (!editingKey) return;
    const idx = selectedSectionIndex;
    setDraft((prev) => {
      const sections = [...prev[editingKey]];
      if (!sections[idx]) return prev;
      sections[idx] = { ...sections[idx], contenu: sections[idx].contenu.filter((_, i) => i !== lineIdx) };
      return { ...prev, [editingKey]: sections };
    });
  }

  async function saveEditor() {
    if (!activeCharge || !editingKey) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const clean: DescriptorPayload = JSON.parse(JSON.stringify(draft)) as DescriptorPayload;
      for (const key of KEYS) {
        clean[key] = clean[key]
          .map((s) => ({
            title: String(s.title ?? "").trim(),
            contenu: (Array.isArray(s.contenu) ? s.contenu : []).map((x) => String(x ?? "").trim()).filter(Boolean),
          }))
          .filter((s) => s.title || s.contenu.length > 0);
      }
      await saveChargeDescripteur({ chargeId: activeCharge.id, descripteur: clean });
      activeCharge.descripteur = clean;
      setEditingKey(null);
      setMessage("Descripteur enregistré.");
    } catch (e) {
      setError((e as Error).message || "Échec enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  const selectedSections = editingKey ? draft[editingKey] : [];
  const selectedSection = selectedSections[selectedSectionIndex];
  const titleLabel =
    editingKey === "plan_cours" ? "Chapitre" : editingKey === "ressources" ? "Ouvrage" : "Point";
  const contentLabel =
    editingKey === "plan_cours"
      ? "Point du chapitre"
      : editingKey === "ressources"
        ? "Description de l'ouvrage (inclure auteur)"
        : "Paragraphe";

  return (
    <>
      <PageManager<DescriptorCard>
        title="Descripteurs de cours"
        description="Choisissez une charge en tabulation, puis éditez ses propriétés de descripteur."
        items={filteredCards}
        tabs={initialData.charges.map((c) => ({ value: c.id, label: c.label }))}
        activeTab={activeChargeId}
        onTabChange={setActiveChargeId}
        searchText={search}
        onSearchChange={setSearch}
        searchPlaceholder="Rechercher une propriété..."
        showCreateButton={false}
        CardCreate={() => null}
        listLayout="grid-3"
        CardItem={({ item }) => (
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
            <p className="text-sm font-semibold text-midnight_text dark:text-white">{item.title}</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.description}</p>
            <p className="mt-3 text-xs text-gray-600 dark:text-gray-300">
              Sections existantes: <strong>{item.sections.length}</strong>
            </p>
            <button
              type="button"
              onClick={() => openEditor(item.keyName)}
              className="mt-3 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white dark:bg-primary dark:text-gray-900"
            >
              Éditer
            </button>
          </div>
        )}
      />
      {message ? <p className="mt-3 text-sm text-emerald-600">{message}</p> : null}
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      {editingKey ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-6xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white">{DESCRIPTOR_META[editingKey].title}</h3>
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              >
                Fermer
              </button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-10">
              <div className="md:col-span-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-gray-500">Sections</p>
                  <button
                    type="button"
                    onClick={addSection}
                    className="rounded-md bg-primary px-2 py-1 text-xs font-semibold text-white dark:bg-primary dark:text-gray-900"
                  >
                    Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {selectedSections.map((s, idx) => (
                    <div
                      key={`${editingKey}-${idx}`}
                      className={`rounded-md border p-2 ${selectedSectionIndex === idx ? "border-primary" : "border-gray-200 dark:border-gray-700"}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSectionIndex(idx)}
                        className="w-full text-left text-xs font-medium text-midnight_text dark:text-white"
                      >
                        {s.title || `${titleLabel} ${idx + 1}`}
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSection(idx)}
                        className="mt-1 text-[11px] text-rose-600"
                      >
                        Supprimer section
                      </button>
                    </div>
                  ))}
                  {selectedSections.length === 0 ? <p className="text-xs text-gray-500">Aucune section.</p> : null}
                </div>
              </div>
              <div className="md:col-span-7 rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                {!selectedSection ? (
                  <p className="text-sm text-gray-500">Sélectionnez une section à éditer.</p>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs text-gray-500">{titleLabel}</label>
                      <input
                        type="text"
                        value={selectedSection.title}
                        onChange={(e) => updateSectionTitle(selectedSectionIndex, e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        placeholder={`${titleLabel}...`}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-500">Contenus</label>
                      <button
                        type="button"
                        onClick={addContenuLine}
                        className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-700"
                      >
                        Ajouter contenu
                      </button>
                    </div>
                    <div className="space-y-2">
                      {selectedSection.contenu.map((line, lineIdx) => (
                        <div key={`line-${lineIdx}`} className="flex items-start gap-2">
                          <textarea
                            value={line}
                            onChange={(e) => updateContenuLine(lineIdx, e.target.value)}
                            rows={2}
                            className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                            placeholder={`${contentLabel}...`}
                          />
                          <button
                            type="button"
                            onClick={() => removeContenuLine(lineIdx)}
                            className="rounded-md border border-rose-300 px-2 py-1 text-xs text-rose-600 dark:border-rose-700"
                          >
                            Suppr.
                          </button>
                        </div>
                      ))}
                      {selectedSection.contenu.length === 0 ? (
                        <p className="text-xs text-gray-500">Aucun contenu pour cette section.</p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingKey(null)}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveEditor()}
                disabled={saving}
                className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-primary dark:text-gray-900"
              >
                {saving ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

