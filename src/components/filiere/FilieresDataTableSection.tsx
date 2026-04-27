"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [formDescTitle, setFormDescTitle] = useState("");
  const [formDescContenu, setFormDescContenu] = useState("");
  const [saving, setSaving] = useState(false);

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

  const openCreate = () => {
    setModalMode("create");
    setEditingId(null);
    setFormDesignation("");
    setFormSlug("");
    setFormDescTitle("");
    setFormDescContenu("");
    setModalOpen(true);
  };

  const openEdit = (row: FiliereTableRow) => {
    setModalMode("edit");
    setEditingId(row.id);
    setFormDesignation(row.designation);
    setFormSlug(row.slug);
    setFormDescTitle("");
    setFormDescContenu("");
    setModalOpen(true);
  };

  const buildDescription = (): { title: string; contenu: string }[] => {
    const t = formDescTitle.trim();
    const c = formDescContenu.trim();
    if (t && c) return [{ title: t, contenu: c }];
    return [];
  };

  const submitModal = async () => {
    const designation = formDesignation.trim();
    if (!designation) {
      setErr("La désignation est obligatoire.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      if (modalMode === "create") {
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
      } else if (editingId) {
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
      }
      setModalOpen(false);
      await load();
      setSelectedIds([]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

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
            className="font-medium text-[#082b1c] underline-offset-2 hover:underline dark:text-[#5ec998]"
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
          subtitle: "CRUD aligné sur le schéma (désignation, slug, description, semestres).",
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
          title: modalMode === "create" ? "Nouvelle filière" : "Modifier la filière",
          onClose: () => !saving && setModalOpen(false),
          children: (
            <div className="space-y-3">
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
                Slug {modalMode === "create" ? "(optionnel, généré si vide)" : "(optionnel)"}
                <input
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  placeholder="ex. licence-informatique"
                />
              </label>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Description (bloc unique optionnel, schéma <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">title</code> +{" "}
                <code className="rounded bg-gray-100 px-1 dark:bg-gray-800">contenu</code>)
              </p>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Titre du bloc"
                value={formDescTitle}
                onChange={(e) => setFormDescTitle(e.target.value)}
              />
              <textarea
                className="min-h-[88px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                placeholder="Contenu"
                value={formDescContenu}
                onChange={(e) => setFormDescContenu(e.target.value)}
              />
            </div>
          ),
          footer: (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => setModalOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium dark:border-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={saving || !formDesignation.trim()}
                onClick={() => void submitModal()}
                className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
            </>
          ),
        }}
      />
    </div>
  );
}
