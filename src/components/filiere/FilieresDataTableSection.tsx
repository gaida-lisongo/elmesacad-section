"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/data/DataTable";

const PAGE_SIZE = 10;

export type FiliereTableRow = {
  id: string;
  designation: string;
  slug: string;
  semestresCount: number;
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function mapApiToRow(raw: Record<string, unknown>): FiliereTableRow {
  const id = String(raw._id ?? "");
  const sem = raw.semestres;
  const semestresCount = Array.isArray(sem) ? sem.length : 0;
  return {
    id,
    designation: String(raw.designation ?? ""),
    slug: String(raw.slug ?? ""),
    semestresCount,
  };
}

type SemestreDraft = { key: string; designation: string; credits: string };

/** Brouillon semestre en édition (lignes existantes ont semestreId). */
type EditSemestreDraft = { key: string; semestreId?: string; designation: string; credits: string };

function serializeSemestresForCompare(drafts: EditSemestreDraft[]): string {
  return JSON.stringify(
    drafts
      .filter((d) => Boolean(d.semestreId?.trim()) || d.designation.trim() || d.credits.trim())
      .map((d) => ({
        id: d.semestreId ?? null,
        designation: d.designation.trim(),
        credits: d.credits.trim(),
      }))
  );
}

type DescSectionDraft = { key: string; title: string; contenu: string };

function newDraftKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `k-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyDescSections(): DescSectionDraft[] {
  return [{ key: newDraftKey(), title: "", contenu: "" }];
}

export default function FilieresDataTableSection() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 350);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<FiliereTableRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDesignation, setFormDesignation] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [descSections, setDescSections] = useState<DescSectionDraft[]>(() => emptyDescSections());
  const [saving, setSaving] = useState(false);
  /** Création uniquement : 1 = filière (slug API), 2 = semestres sans UE */
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createdFiliereId, setCreatedFiliereId] = useState<string | null>(null);
  const [createdFiliereSlug, setCreatedFiliereSlug] = useState("");
  const [createdFiliereDesignation, setCreatedFiliereDesignation] = useState("");
  const [semestreDrafts, setSemestreDrafts] = useState<SemestreDraft[]>([
    { key: newDraftKey(), designation: "", credits: "" },
  ]);
  const [editTab, setEditTab] = useState<"filiere" | "semestres">("filiere");
  const [editSemestreDrafts, setEditSemestreDrafts] = useState<EditSemestreDraft[]>([
    { key: newDraftKey(), designation: "", credits: "" },
  ]);
  const editSemestresSnapshotRef = useRef<string>("");
  const editSemestresInitialIdsRef = useRef<string[]>([]);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      sp.set("offset", String(page * PAGE_SIZE));
      sp.set("limit", String(PAGE_SIZE));
      sp.set("search", debouncedSearch.trim());
      const res = await fetch(`/api/filieres?${sp.toString()}`, { cache: "no-store" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Chargement impossible");
      const data = Array.isArray(j.data) ? (j.data as Record<string, unknown>[]) : [];
      setRows(data.map(mapApiToRow));
      setTotal(typeof j.pagination?.total === "number" ? j.pagination.total : 0);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch]);

  const resetCreateWizard = useCallback(() => {
    setCreateStep(1);
    setCreatedFiliereId(null);
    setCreatedFiliereSlug("");
    setCreatedFiliereDesignation("");
    setSemestreDrafts([{ key: newDraftKey(), designation: "", credits: "" }]);
    setDescSections(emptyDescSections());
  }, []);

  const resetEditSemestreState = useCallback(() => {
    setEditTab("filiere");
    setEditSemestreDrafts([{ key: newDraftKey(), designation: "", credits: "" }]);
    editSemestresSnapshotRef.current = "";
    editSemestresInitialIdsRef.current = [];
  }, []);

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormDesignation("");
    setFormSlug("");
    resetEditSemestreState();
    resetCreateWizard();
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    resetCreateWizard();
    resetEditSemestreState();
  };

  const openEdit = async (row: FiliereTableRow) => {
    setModalMode("edit");
    setEditingId(row.id);
    setFormDesignation(row.designation);
    setFormSlug(row.slug);
    setEditTab("filiere");
    setDescSections(emptyDescSections());
    setCreateStep(1);
    setCreatedFiliereId(null);
    setModalOpen(true);
    setErr(null);
    try {
      const res = await fetch(`/api/filieres/${row.id}`, { cache: "no-store" });
      const j = (await res.json()) as { message?: string; data?: Record<string, unknown> };
      if (!res.ok) throw new Error(j.message || "Chargement impossible");
      const doc = j.data;
      const arr = doc?.description;
      if (Array.isArray(arr) && arr.length > 0) {
        setDescSections(
          arr.map((item) => {
            const o = item as Record<string, unknown>;
            return {
              key: newDraftKey(),
              title: String(o?.title ?? ""),
              contenu: String(o?.contenu ?? ""),
            };
          })
        );
      } else {
        setDescSections(emptyDescSections());
      }

      const semRaw = doc?.semestres;
      let semDrafts: EditSemestreDraft[];
      if (Array.isArray(semRaw) && semRaw.length > 0) {
        semDrafts = semRaw.map((item) => {
          const o = item as Record<string, unknown>;
          const sid = o._id != null ? String(o._id) : "";
          const cr = o.credits;
          return {
            key: newDraftKey(),
            semestreId: sid || undefined,
            designation: String(o.designation ?? ""),
            credits: typeof cr === "number" && Number.isFinite(cr) ? String(cr) : "",
          };
        });
      } else {
        semDrafts = [{ key: newDraftKey(), designation: "", credits: "" }];
      }
      editSemestresSnapshotRef.current = serializeSemestresForCompare(semDrafts);
      editSemestresInitialIdsRef.current = semDrafts
        .map((d) => d.semestreId?.trim())
        .filter((id): id is string => Boolean(id));
      setEditSemestreDrafts(semDrafts);
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const buildDescription = (): { title: string; contenu: string }[] =>
    descSections
      .map((s) => ({ title: s.title.trim(), contenu: s.contenu.trim() }))
      .filter((b) => b.title.length > 0 && b.contenu.length > 0);

  const addDescSection = () => {
    setDescSections((prev) => [...prev, { key: newDraftKey(), title: "", contenu: "" }]);
  };

  const removeDescSection = (key: string) => {
    setDescSections((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.key !== key)));
  };

  const updateDescSection = (key: string, field: "title" | "contenu", value: string) => {
    setDescSections((prev) => prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
  };

  const descSectionsFields = (
    <div className="space-y-3">
      <p className="text-[11px] text-gray-500 dark:text-gray-400">
        Sections descriptives (optionnel) : chaque bloc avec{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">title</code> +{" "}
        <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">contenu</code> est enregistré. Les champs vides
        sont ignorés.
      </p>
      <div className="space-y-3">
        {descSections.map((d, index) => (
          <div
            key={d.key}
            className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">Section {index + 1}</span>
              <button
                type="button"
                disabled={descSections.length <= 1}
                onClick={() => removeDescSection(d.key)}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
              >
                Retirer
              </button>
            </div>
            <input
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              placeholder="Titre"
              value={d.title}
              onChange={(e) => updateDescSection(d.key, "title", e.target.value)}
            />
            <textarea
              className="min-h-[100px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:min-h-[120px]"
              placeholder="Contenu"
              value={d.contenu}
              onChange={(e) => updateDescSection(d.key, "contenu", e.target.value)}
            />
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addDescSection}
        className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary dark:border-primary dark:text-primary"
      >
        + Ajouter une section
      </button>
    </div>
  );

  /** Étape 1 création : POST filière uniquement (slug généré côté API). */
  const submitCreateStep1 = async () => {
    const designation = formDesignation.trim();
    if (!designation) {
      setErr("La désignation est obligatoire.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/filieres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation,
          description: buildDescription(),
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Création impossible");
      const doc = j.data as Record<string, unknown> | undefined;
      const id = doc?._id != null ? String(doc._id) : "";
      const slug = doc?.slug != null ? String(doc.slug) : "";
      const des = doc?.designation != null ? String(doc.designation) : designation;
      if (!id) throw new Error("Réponse API invalide (id filière)");
      setCreatedFiliereId(id);
      setCreatedFiliereSlug(slug);
      setCreatedFiliereDesignation(des);
      setCreateStep(2);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  /** Étape 2 création : POST semestres en masse (insertMany côté API). */
  const submitCreateStep2 = async () => {
    if (!createdFiliereId) {
      setErr("Identifiant filière manquant.");
      return;
    }
    const toCreate = semestreDrafts
      .map((d) => ({
        designation: d.designation.trim(),
        credits: d.credits.trim(),
      }))
      .filter((d) => d.designation.length > 0);

    setSaving(true);
    setErr(null);
    try {
      if (toCreate.length > 0) {
        const semestres = toCreate.map((s) => {
          const row: { designation: string; description: []; credits?: number } = {
            designation: s.designation,
            description: [],
          };
          const c = Number.parseFloat(s.credits.replace(",", "."));
          if (Number.isFinite(c) && c >= 0) row.credits = c;
          return row;
        });
        const res = await fetch(`/api/filieres/${createdFiliereId}/semestres`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ semestres }),
        });
        const j = (await res.json()) as { message?: string };
        if (!res.ok) throw new Error(j.message || "Échec création des semestres");
      }
      setModalOpen(false);
      resetCreateWizard();
      resetEditSemestreState();
      await load();
      setSelectedIds([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const submitEdit = async () => {
    const designation = formDesignation.trim();
    if (!designation || !editingId) {
      setErr("La désignation est obligatoire.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {
        designation,
        description: buildDescription(),
      };
      const slugTrim = formSlug.trim();
      if (slugTrim) body.slug = slugTrim;
      const res = await fetch(`/api/filieres/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Mise à jour impossible");

      const semChanged =
        serializeSemestresForCompare(editSemestreDrafts) !== editSemestresSnapshotRef.current;
      if (semChanged) {
        if (
          editSemestreDrafts.some((d) => Boolean(d.semestreId?.trim()) && !d.designation.trim())
        ) {
          throw new Error("Chaque semestre déjà enregistré doit avoir une désignation.");
        }
        const draftsWithId = editSemestreDrafts.filter((d) => d.semestreId?.trim());
        const currentIds = draftsWithId.map((d) => d.semestreId!.trim());
        const toDelete = editSemestresInitialIdsRef.current.filter((id) => !currentIds.includes(id));

        for (const sid of toDelete) {
          const del = await fetch(`/api/filieres/${editingId}/semestres/${sid}`, { method: "DELETE" });
          const dj = (await del.json()) as { message?: string };
          if (!del.ok) throw new Error(dj.message || `Suppression semestre impossible (${sid})`);
        }

        for (const d of draftsWithId) {
          const des = d.designation.trim();
          if (!des) continue;
          const patch: Record<string, unknown> = { designation: des };
          const crRaw = d.credits.trim();
          if (crRaw.length > 0) {
            const c = Number.parseFloat(crRaw.replace(",", "."));
            if (Number.isFinite(c) && c >= 0) patch.credits = c;
          }
          const pr = await fetch(`/api/filieres/${editingId}/semestres/${d.semestreId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          });
          const pj = (await pr.json()) as { message?: string };
          if (!pr.ok) throw new Error(pj.message || `Mise à jour semestre impossible`);
        }

        const newOnes = editSemestreDrafts.filter((d) => !d.semestreId?.trim() && d.designation.trim());
        if (newOnes.length > 0) {
          const semestres = newOnes.map((d) => {
            const row: { designation: string; description: []; credits?: number } = {
              designation: d.designation.trim(),
              description: [],
            };
            const c = Number.parseFloat(d.credits.replace(",", "."));
            if (Number.isFinite(c) && c >= 0) row.credits = c;
            return row;
          });
          const cr = await fetch(`/api/filieres/${editingId}/semestres`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ semestres }),
          });
          const cj = (await cr.json()) as { message?: string };
          if (!cr.ok) throw new Error(cj.message || "Création des nouveaux semestres impossible");
        }
      }

      setModalOpen(false);
      resetCreateWizard();
      resetEditSemestreState();
      await load();
      setSelectedIds([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const addSemestreDraft = () => {
    setSemestreDrafts((prev) => [...prev, { key: newDraftKey(), designation: "", credits: "" }]);
  };

  const removeSemestreDraft = (key: string) => {
    setSemestreDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.key !== key)));
  };

  const updateSemestreDraft = (key: string, field: "designation" | "credits", value: string) => {
    setSemestreDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, [field]: value } : d))
    );
  };

  const addEditSemestreDraft = () => {
    setEditSemestreDrafts((prev) => [...prev, { key: newDraftKey(), designation: "", credits: "" }]);
  };

  const removeEditSemestreDraft = (key: string) => {
    setEditSemestreDrafts((prev) => (prev.length <= 1 ? prev : prev.filter((d) => d.key !== key)));
  };

  const updateEditSemestreDraft = (key: string, field: "designation" | "credits", value: string) => {
    setEditSemestreDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, [field]: value } : d))
    );
  };

  const editSemestresFields = (
    <div className="space-y-4">
      <p className="text-xs text-gray-600 dark:text-gray-400">
        Modifiez les semestres existants, ajoutez des lignes sans identifiant pour en créer de nouveaux, ou retirez une
        ligne pour supprimer le semestre correspondant (les unités d’enseignement liées restent en base — vérifiez la
        cohérence côté fiche filière si besoin).
      </p>
      <div className="space-y-2">
        {editSemestreDrafts.map((d, index) => (
          <div
            key={d.key}
            className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
          >
            <label className="min-w-[10rem] flex-1 text-xs font-medium text-gray-600 dark:text-gray-300">
              Semestre {index + 1} — désignation *
              <input
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={d.designation}
                onChange={(e) => updateEditSemestreDraft(d.key, "designation", e.target.value)}
                placeholder="ex. Semestre 1"
              />
            </label>
            <label className="w-24 text-xs font-medium text-gray-600 dark:text-gray-300">
              Crédits
              <input
                type="text"
                inputMode="decimal"
                className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                value={d.credits}
                onChange={(e) => updateEditSemestreDraft(d.key, "credits", e.target.value)}
                placeholder="—"
              />
            </label>
            {d.semestreId ? (
              <span className="font-mono text-[10px] text-gray-400" title="Identifiant MongoDB">
                id…{d.semestreId.slice(-6)}
              </span>
            ) : (
              <span className="text-[10px] font-medium text-primary dark:text-primary">Nouveau</span>
            )}
            <button
              type="button"
              disabled={editSemestreDrafts.length <= 1}
              onClick={() => removeEditSemestreDraft(d.key)}
              className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
              aria-label="Retirer cette ligne"
            >
              Retirer
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={addEditSemestreDraft}
        className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary dark:border-primary dark:text-primary"
      >
        + Ajouter un semestre
      </button>
    </div>
  );

  const modalTitle =
    modalMode === "edit"
      ? "Modifier la filière"
      : createStep === 1
        ? "Nouvelle filière — étape 1 / 2"
        : "Semestres — étape 2 / 2";

  const deleteOne = async (id: string) => {
    if (!window.confirm("Supprimer cette filière ?")) return;
    setErr(null);
    try {
      const res = await fetch(`/api/filieres/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Suppression impossible");
      setSelectedIds((s) => s.filter((x) => x !== id));
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const deleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Supprimer ${selectedIds.length} filière(s) ?`)) return;
    setErr(null);
    try {
      for (const id of selectedIds) {
        const res = await fetch(`/api/filieres/${id}`, { method: "DELETE" });
        const j = await res.json();
        if (!res.ok) throw new Error(j.message || `Échec suppression ${id}`);
      }
      setSelectedIds([]);
      await load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const columns: DataTableColumn<FiliereTableRow>[] = useMemo(
    () => [
      {
        id: "designation",
        header: "Désignation",
        cell: (row) => (
          <Link
            href={`/filiere/${encodeURIComponent(row.slug)}`}
            className="font-medium text-primary underline-offset-2 hover:underline dark:text-primary"
          >
            {row.designation}
          </Link>
        ),
      },
      {
        id: "slug",
        header: "Slug",
        cell: (row) => <span className="font-mono text-xs text-gray-600 dark:text-gray-400">{row.slug}</span>,
      },
      {
        id: "sem",
        header: "Semestres",
        cell: (row) => <span className="tabular-nums">{row.semestresCount}</span>,
      },
    ],
    []
  );

  return (
    <div className="w-full min-w-0 space-y-2">
      {err && (
        <p className="text-xs text-red-600 dark:text-red-400" role="alert">
          {err}
        </p>
      )}
      <DataTable<FiliereTableRow>
        collapsible={{
          title: "Filières",
          subtitle:
            "Création en 2 étapes : filière (slug auto), sections descriptives, puis semestres en masse. Édition : onglets Filière / Semestres.",
          defaultOpen: true,
        }}
        columns={columns}
        rows={rows}
        isLoading={loading}
        emptyMessage="Aucune filière ne correspond à votre recherche."
        searchPlaceholder="Rechercher par désignation ou slug…"
        searchValue={search}
        onSearchChange={setSearch}
        primaryAction={{ label: "Nouvelle filière", onClick: openCreate, icon: "solar:add-circle-linear" }}
        secondaryActions={
          selectedIds.length > 0 ? (
            <button
              type="button"
              onClick={() => void deleteSelected()}
              className="rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
            >
              Supprimer la sélection ({selectedIds.length})
            </button>
          ) : null
        }
        selectable
        selectedIds={selectedIds}
        onSelectedIdsChange={setSelectedIds}
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        rowActions={(row) => (
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => openEdit(row)}
              className="rounded border border-gray-300 px-2 py-0.5 text-xs font-medium text-midnight_text hover:bg-gray-50 dark:border-gray-600 dark:text-white dark:hover:bg-gray-800"
            >
              Modifier
            </button>
            <button
              type="button"
              onClick={() => void deleteOne(row.id)}
              className="rounded border border-red-200 px-2 py-0.5 text-xs font-medium text-red-700 hover:bg-red-50 dark:border-red-900/40 dark:text-red-300 dark:hover:bg-red-950/30"
            >
              Supprimer
            </button>
          </div>
        )}
        modal={{
          open: modalOpen,
          title: modalTitle,
          onClose: closeModal,
          panelClassName:
            "max-h-[94vh] w-full max-w-[min(88rem,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900",
          bodyClassName: "px-5 py-5 sm:px-8 sm:py-6",
          children:
            modalMode === "edit" ? (
              <div className="space-y-4">
                <div
                  className="flex gap-1 border-b border-gray-200 dark:border-gray-700"
                  role="tablist"
                  aria-label="Zone d’édition"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={editTab === "filiere"}
                    onClick={() => setEditTab("filiere")}
                    className={`rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold transition ${
                      editTab === "filiere"
                        ? "border-gray-300 bg-white text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    Filière
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={editTab === "semestres"}
                    onClick={() => setEditTab("semestres")}
                    className={`rounded-t-md border border-b-0 px-4 py-2 text-sm font-semibold transition ${
                      editTab === "semestres"
                        ? "border-gray-300 bg-white text-primary dark:border-gray-600 dark:bg-gray-900 dark:text-white"
                        : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
                    }`}
                  >
                    Semestres
                  </button>
                </div>
                {editTab === "filiere" ? (
                  <div className="space-y-4 pt-1">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Désignation *
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={formDesignation}
                        onChange={(e) => setFormDesignation(e.target.value)}
                        required
                      />
                    </label>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                      Slug (optionnel)
                      <input
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        value={formSlug}
                        onChange={(e) => setFormSlug(e.target.value)}
                        placeholder="ex. licence-informatique"
                      />
                    </label>
                    {descSectionsFields}
                  </div>
                ) : (
                  <div className="pt-1">{editSemestresFields}</div>
                )}
              </div>
            ) : createStep === 1 ? (
              <div className="space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Le <strong>slug</strong> est généré automatiquement à partir de la désignation. Vous pourrez ajouter les
                  semestres à l’étape suivante (sans unités d’enseignement).
                </p>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Désignation de la filière *
                  <input
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    value={formDesignation}
                    onChange={(e) => setFormDesignation(e.target.value)}
                    required
                  />
                </label>
                {descSectionsFields}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                  <p className="font-medium text-midnight_text dark:text-white">{createdFiliereDesignation}</p>
                  <p className="mt-1 font-mono text-xs text-gray-600 dark:text-gray-400">{createdFiliereSlug}</p>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Chaque semestre est lié à cette filière uniquement. Les unités d’enseignement restent vides ; vous
                  pourrez les ajouter plus tard depuis la fiche filière.
                </p>
                <div className="space-y-2">
                  {semestreDrafts.map((d, index) => (
                    <div
                      key={d.key}
                      className="flex flex-wrap items-end gap-2 rounded-lg border border-gray-200 p-3 dark:border-gray-700"
                    >
                      <label className="min-w-[10rem] flex-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                        Semestre {index + 1} — désignation *
                        <input
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          value={d.designation}
                          onChange={(e) => updateSemestreDraft(d.key, "designation", e.target.value)}
                          placeholder="ex. Semestre 1"
                        />
                      </label>
                      <label className="w-24 text-xs font-medium text-gray-600 dark:text-gray-300">
                        Crédits
                        <input
                          type="text"
                          inputMode="decimal"
                          className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                          value={d.credits}
                          onChange={(e) => updateSemestreDraft(d.key, "credits", e.target.value)}
                          placeholder="—"
                        />
                      </label>
                      <button
                        type="button"
                        disabled={semestreDrafts.length <= 1}
                        onClick={() => removeSemestreDraft(d.key)}
                        className="rounded-md border border-gray-300 px-2 py-1.5 text-xs text-gray-600 disabled:opacity-40 dark:border-gray-600 dark:text-gray-300"
                        aria-label="Retirer cette ligne"
                      >
                        Retirer
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={addSemestreDraft}
                  className="inline-flex items-center gap-1 rounded-md border border-primary px-3 py-1.5 text-xs font-semibold text-primary dark:border-primary dark:text-primary"
                >
                  + Ajouter un semestre
                </button>
              </div>
            ),
          footer:
            modalMode === "edit" ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving || !formDesignation.trim()}
                  onClick={() => void submitEdit()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </>
            ) : createStep === 1 ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving || !formDesignation.trim()}
                  onClick={() => void submitCreateStep1()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Création…" : "Suivant : semestres"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={closeModal}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void submitCreateStep2()}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {saving ? "Enregistrement…" : "Terminer"}
                </button>
              </>
            ),
        }}
      />
    </div>
  );
}
