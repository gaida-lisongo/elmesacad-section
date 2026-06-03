"use client";

import { useMemo, useRef, useState } from "react";
import { PageListe } from "@/components/Layout/PageListe";
import { DataTable } from "@/components/data/DataTable";
import { Icon } from "@iconify/react";
import {
  createParcoursBulkStudentService,
  deleteParcoursBulkStudentService,
  patchParcoursBulkStudentService,
  updateParcoursStudentService,
} from "@/actions/gestionnaireParcours";
import type { ProgrammeDoc } from "@/lib/models/Programme";
import type { AnneeDoc } from "@/lib/models/Annee";

// ── Types ─────────────────────────────────────────────────────
type ParcoursRow = {
  id: string;
  nomComplet: string;
  matricule: string;
  email: string;
  sexe: string;
  nationalite: string;
  date_naissance: string;
  lieu_naissance: string;
  photo: string;
  status: string;
  reference: string;
};

type CsvDraftRow = {
  nomComplet: string;
  matricule: string;
  sexe: string;
  nationalite: string;
  date_naissance: string;
  lieu_naissance: string;
  email: string;
};

// ── Constantes ────────────────────────────────────────────────
const LOCAL_PAGE_SIZE = 15;
const STATUS_OPTIONS = ["inscrit", "suspendu", "abandon", "diplômé"] as const;

// ── Helpers ───────────────────────────────────────────────────
function statusLabel(value: string): string {
  switch (value) {
    case "inscrit": return "Inscrit";
    case "suspendu": return "Suspendu";
    case "abandon": return "Abandon";
    case "diplômé": return "Finaliste";
    default: return value || "—";
  }
}

function statusColor(value: string): string {
  switch (value) {
    case "inscrit": return "#10b981";
    case "suspendu": return "#f59e0b";
    case "abandon": return "#f43f5e";
    case "diplômé": return "#0ea5e9";
    default: return "#6b7280";
  }
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ET";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatDateFr(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
}

// ── CSV helpers ───────────────────────────────────────────────
function normalizeHeader(input: string): string {
  return input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i += 1; }
      else { inQuotes = !inQuotes; }
      continue;
    }
    if (ch === delimiter && !inQuotes) { values.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string): CsvDraftRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length <= 1) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const idx = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));
  const idxNom = idx(["nom", "nomcomplet"]);
  const idxMat = idx(["matricule"]);
  const idxSexe = idx(["sexe"]);
  const idxNat = idx(["nationalite", "natiobnalite"]);
  const idxDN = idx(["datenaissance"]);
  const idxLN = idx(["lieudenaissance", "lieunaissance"]);
  const idxEmail = idx(["email", "mail"]);
  return lines.slice(1).flatMap((line) => {
    const cols = splitCsvLine(line, delimiter);
    const row: CsvDraftRow = {
      nomComplet: idxNom >= 0 ? String(cols[idxNom] ?? "").trim() : "",
      matricule: idxMat >= 0 ? String(cols[idxMat] ?? "").trim() : "",
      sexe: idxSexe >= 0 ? String(cols[idxSexe] ?? "M").trim().toUpperCase() : "M",
      nationalite: idxNat >= 0 ? String(cols[idxNat] ?? "").trim() : "",
      date_naissance: idxDN >= 0 ? String(cols[idxDN] ?? "").trim() : "",
      lieu_naissance: idxLN >= 0 ? String(cols[idxLN] ?? "").trim() : "",
      email: idxEmail >= 0 ? String(cols[idxEmail] ?? "").trim().toLowerCase() : "",
    };
    if (!row.nomComplet || !row.matricule || !row.email) return [];
    row.sexe = row.sexe === "F" ? "F" : "M";
    return [row];
  });
}

// ── Composant principal ───────────────────────────────────────
export default function SectionProgrammeParcoursClient({
  programmeSlug, anneeSlug, programme, annee, autorizations, parcours: initialParcours, scope,
}: {
  programmeSlug: string; anneeSlug: string; programme: ProgrammeDoc; annee: AnneeDoc;
  autorizations: { canCreateDelete: boolean; canUpdateStatus: boolean };
  parcours: ParcoursRow[];
  scope?: { sectionDesignation?: string; sectionSlug?: string };
}) {
  const [rows] = useState<ParcoursRow[]>(initialParcours);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [bulkStatus, setBulkStatus] = useState("inscrit");
  const [csvRows, setCsvRows] = useState<CsvDraftRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<ParcoursRow | null>(null);
  const [editForm, setEditForm] = useState<ParcoursRow | null>(null);
  const photoRef = useRef<HTMLInputElement | null>(null);

  // ── Filtrage & pagination internes ──────────────────────────
  const filtered = useMemo(() => {
    let data = rows;
    if (statusFilter) data = data.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      data = data.filter((r) => r.nomComplet.toLowerCase().includes(q) || r.matricule.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
    }
    return data;
  }, [rows, statusFilter, search]);

  const totalFiltered = filtered.length;
  const paginatedRows = useMemo(() => filtered.slice(page * LOCAL_PAGE_SIZE, (page + 1) * LOCAL_PAGE_SIZE), [filtered, page]);

  // ── Stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const counts: Record<string, number> = { total: rows.length };
    for (const s of STATUS_OPTIONS) counts[s] = 0;
    for (const r of rows) { if (counts[r.status] !== undefined) counts[r.status] += 1; }
    return counts;
  }, [rows]);

  // ── CSV ─────────────────────────────────────────────────────
  const onCsvSelected = async (file: File | null) => { if (file) setCsvRows(parseCsv(await file.text())); };

  const downloadTemplate = () => {
    const h = ["Nom", "Matricule", "Sexe", "Nationalite", "Date_naissance", "Lieu de Naissance", "Email"];
    const s = ["KABILA Moise", "2026001", "M", "CD", "2000-01-15", "Kinshasa", "etudiant@example.com"];
    const csv = `${h.join(";")}\n${s.join(";")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "template-parcours.csv"; a.click(); URL.revokeObjectURL(url);
  };

  const createBulk = async () => {
    if (!autorizations.canCreateDelete || csvRows.length === 0) return;
    setBusy("create"); setProgress(0); setErr(null);
    try {
      const chunks = Math.ceil(csvRows.length / 100);
      for (let i = 0; i < chunks; i += 1) {
        const chunk = csvRows.slice(i * 100, (i + 1) * 100);
        await createParcoursBulkStudentService(chunk.map((row, idx) => ({
          student: { email: row.email, matricule: row.matricule, sexe: row.sexe, nomComplet: row.nomComplet, photo: "", nationalite: row.nationalite, date_naissance: row.date_naissance, lieu_naissance: row.lieu_naissance },
          programme: { classe: programmeSlug, filiere: scope?.sectionSlug ?? "", credits: programme.credits },
          annee: { debut: String(annee.debut), fin: String(annee.fin), slug: anneeSlug },
          status: "suspendu", ncv: 0,
          reference: `${anneeSlug}/${programmeSlug}/${row.matricule}/${Date.now()}${idx}`,
        })));
        setProgress(Math.round(((i + 1) / chunks) * 100));
      }
      setCsvRows([]); window.location.reload();
    } catch (error) { setErr((error as Error).message); }
    finally { setBusy(null); }
  };

  // ── Bulk actions ────────────────────────────────────────────
  const patchBulk = async () => {
    if (!autorizations.canUpdateStatus || selectedIds.length === 0) return;
    setBusy("patch"); setErr(null);
    try { await patchParcoursBulkStudentService(selectedIds.map((id) => ({ _id: id, status: bulkStatus }))); setSelectedIds([]); window.location.reload(); }
    catch (error) { setErr((error as Error).message); }
    finally { setBusy(null); }
  };

  const deleteBulk = async () => {
    if (!autorizations.canCreateDelete || selectedIds.length === 0) return;
    setBusy("delete"); setErr(null);
    try { await deleteParcoursBulkStudentService(selectedIds); setSelectedIds([]); window.location.reload(); }
    catch (error) { setErr((error as Error).message); }
    finally { setBusy(null); }
  };

  // ── Edit modal ──────────────────────────────────────────────
  const openEdit = (row: ParcoursRow) => { setEditing(row); setEditForm({ ...row }); };
  const closeEdit = () => { if (busy === "save" || busy === "photo") return; setEditing(null); setEditForm(null); };

  const uploadPhoto = async (file: File | null) => {
    if (!file || !editForm) return;
    setBusy("photo"); setErr(null);
    try {
      const fd = new FormData(); fd.set("file", file);
      const res = await fetch("/api/section/parcours/upload-photo", { method: "POST", body: fd });
      const p = (await res.json().catch(() => ({}))) as { photo?: string; message?: string };
      if (!res.ok) throw new Error(p.message || "Upload photo impossible");
      if (p.photo) setEditForm((prev) => (prev ? { ...prev, photo: p.photo! } : prev));
    } catch (error) { setErr((error as Error).message); }
    finally { setBusy(null); }
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setBusy("save"); setErr(null);
    try {
      await updateParcoursStudentService({
        id: editForm.id,
        student: { nomComplet: editForm.nomComplet.trim(), email: editForm.email.trim().toLowerCase(), matricule: editForm.matricule.trim(), sexe: editForm.sexe.trim().toUpperCase() === "F" ? "F" : "M", nationalite: editForm.nationalite.trim(), date_naissance: editForm.date_naissance.trim(), lieu_naissance: editForm.lieu_naissance.trim(), photo: editForm.photo.trim() },
        ...(autorizations.canUpdateStatus ? { status: editForm.status } : {}),
      });
      closeEdit(); window.location.reload();
    } catch (error) { setErr((error as Error).message); }
    finally { setBusy(null); }
  };

  // ── Colonnes DataTable ──────────────────────────────────────
  const columns = useMemo(() => [
    { id: "nomComplet", header: "Étudiant",
      cell: (row: ParcoursRow) => (
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
            {row.photo ? <img src={row.photo} alt={row.nomComplet} className="h-full w-full object-cover" />
              : <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gray-500">{getInitials(row.nomComplet)}</span>}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">{row.nomComplet}</p>
            <p className="truncate text-xs text-gray-500">{row.email}</p>
          </div>
        </div>
      ) },
    { id: "matricule", header: "Matricule", cell: (row: ParcoursRow) => <span className="font-mono text-xs font-medium text-gray-700 dark:text-gray-300">{row.matricule}</span> },
    { id: "status", header: "Statut", cell: (row: ParcoursRow) => (
      <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
        style={{ backgroundColor: `${statusColor(row.status)}18`, color: statusColor(row.status) }}>
        <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ backgroundColor: statusColor(row.status) }} />
        {statusLabel(row.status)}
      </span>
    ) },
    { id: "sexe", header: "Sexe", cell: (row: ParcoursRow) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.sexe || "—"}</span> },
    { id: "date_naissance", header: "Né(e) le", cell: (row: ParcoursRow) => <span className="text-xs text-gray-600 dark:text-gray-400">{formatDateFr(row.date_naissance)}</span> },
    { id: "lieu_naissance", header: "Lieu", cell: (row: ParcoursRow) => <span className="text-xs text-gray-600 dark:text-gray-400">{row.lieu_naissance || "—"}</span> },
  ], []);

  // ── Filtre statut ────────────────────────────────────────────
  const filterSlot = useMemo(() => (
    <div className="flex items-center gap-1.5">
      {["", ...STATUS_OPTIONS].map((s) => (
        <button key={s || "all"} type="button" onClick={() => { setPage(0); setStatusFilter(s); }}
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${statusFilter === s ? "bg-primary text-white shadow-xs" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"}`}>
          {s ? statusLabel(s) : "Tous"}
        </button>
      ))}
    </div>
  ), [statusFilter]);

  // ── Sidebar ──────────────────────────────────────────────────
  const sidebar = useMemo(() => (
    <div className="space-y-3">
      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">Statistiques</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Total</span>
            <span className="font-bold text-midnight_text dark:text-white">{stats.total}</span>
          </div>
          {STATUS_OPTIONS.map((s) => (
            <div key={s} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: statusColor(s) }} />
                <span className="text-gray-600 dark:text-gray-400">{statusLabel(s)}</span>
              </div>
              <span className="font-semibold text-midnight_text dark:text-white">{stats[s] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {autorizations.canCreateDelete && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
            <Icon icon="solar:document-add-linear" className="mr-1 inline-block size-3.5" />Import CSV
          </p>
          <button type="button" onClick={downloadTemplate}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-300 px-3 py-2 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30">
            <Icon icon="solar:download-linear" className="size-3.5" />Template
          </button>
          <label className="mt-2 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-xs text-gray-600 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800">
            <Icon icon="solar:upload-linear" className="size-3.5" />{csvRows.length > 0 ? `${csvRows.length} ligne(s)` : "Charger CSV"}
            <input className="sr-only" type="file" accept=".csv,text/csv" onChange={(e) => void onCsvSelected(e.target.files?.[0] ?? null)} />
          </label>
          <button type="button" onClick={() => void createBulk()} disabled={busy === "create" || csvRows.length === 0}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-darkprimary disabled:opacity-50">
            {busy === "create" ? <Icon icon="solar:spinner-bold" className="size-3.5 animate-spin" /> : <Icon icon="solar:import-linear" className="size-3.5" />}
            Importer {csvRows.length > 0 ? `(${csvRows.length})` : ""}
          </button>
          {progress > 0 && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {!autorizations.canCreateDelete && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <Icon icon="solar:shield-warning-linear" className="mr-1 inline-block size-3.5" />
          Création/suppression désactivée&nbsp;: réservé au secrétaire.
        </div>
      )}
      {!autorizations.canUpdateStatus && (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
          <Icon icon="solar:shield-warning-linear" className="mr-1 inline-block size-3.5" />
          Mise à jour de statut désactivée&nbsp;: réservée au secrétaire.
        </div>
      )}
    </div>
  ), [autorizations, busy, csvRows, progress, stats]);

  return (
    <PageListe heading={
      <div>
        <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Parcours — {programme.designation || programmeSlug}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          <Icon icon="solar:buildings-linear" className="mr-1 inline-block size-4 align-text-bottom" />
          {scope?.sectionDesignation || "—"} · Année {annee.designation || anneeSlug}
        </p>
      </div>
    } sidebar={sidebar}>
      {err && (
        <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          <Icon icon="solar:danger-triangle-linear" className="size-4 shrink-0" />{err}
        </div>
      )}

      <DataTable columns={columns} rows={paginatedRows}
        searchValue={search} onSearchChange={(v) => { setPage(0); setSearch(v); }}
        searchPlaceholder="Rechercher par nom, matricule ou email…"
        selectable selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds}
        filterSlot={filterSlot}
        secondaryActions={
          <>
            {autorizations.canUpdateStatus && (
              <div className="flex items-center gap-1.5">
                <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)}
                  className="rounded-md border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
                <button type="button" onClick={() => void patchBulk()} disabled={busy === "patch" || selectedIds.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-darkprimary disabled:opacity-50">
                  {busy === "patch" ? <Icon icon="solar:spinner-bold" className="size-3.5 animate-spin" /> : <Icon icon="solar:check-circle-linear" className="size-3.5" />}
                  Appliquer ({selectedIds.length})
                </button>
              </div>
            )}
            {autorizations.canCreateDelete && (
              <button type="button" onClick={() => void deleteBulk()} disabled={busy === "delete" || selectedIds.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-300 dark:hover:bg-red-950/30">
                {busy === "delete" ? <Icon icon="solar:spinner-bold" className="size-3.5 animate-spin" /> : <Icon icon="solar:trash-bin-trash-linear" className="size-3.5" />}
                Supprimer ({selectedIds.length})
              </button>
            )}
          </>
        }
        pagination={{ page, pageSize: LOCAL_PAGE_SIZE, total: totalFiltered, onPageChange: setPage }}
        emptyMessage="Aucun étudiant trouvé pour ce parcours."
        rowActions={(row: ParcoursRow) => (
          <button type="button" onClick={() => openEdit(row)}
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">
            <Icon icon="solar:pen-linear" className="size-3.5" />Modifier
          </button>
        )}
      />

      {editing && editForm && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-midnight_text dark:text-white">
                  <Icon icon="solar:user-id-linear" className="mr-1.5 inline-block size-4" />{editForm.nomComplet}
                </h3>
                <p className="mt-0.5 text-xs text-gray-500">Réf: {editing.reference}</p>
              </div>
              <button type="button" onClick={closeEdit} className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Fermer">
                <Icon icon="solar:close-circle-linear" className="size-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div className="grid gap-5 md:grid-cols-[200px_minmax(0,1fr)]">
                <section className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Photo</p>
                  <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/40">
                    {editForm.photo ? <img src={editForm.photo} alt={editForm.nomComplet} className="h-full w-full object-cover" />
                      : <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-gray-400">{getInitials(editForm.nomComplet)}</div>}
                    <button type="button" onClick={() => photoRef.current?.click()}
                      className="absolute bottom-2 left-2 right-2 rounded-lg bg-black/70 px-2 py-1.5 text-[11px] font-semibold text-white backdrop-blur-xs transition hover:bg-black/80">
                      <Icon icon="solar:camera-linear" className="mr-1 inline-block size-3" />Changer
                    </button>
                    <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png,.webp,.gif,image/*" className="hidden" onChange={(e) => void uploadPhoto(e.target.files?.[0] ?? null)} />
                  </div>
                </section>

                <section className="grid gap-4 sm:grid-cols-2">
                  {[
                    { label: "Nom complet", key: "nomComplet", type: "text" },
                    { label: "Email", key: "email", type: "email" },
                    { label: "Matricule", key: "matricule", type: "text" },
                    { label: "Nationalité", key: "nationalite", type: "text" },
                    { label: "Date de naissance", key: "date_naissance", type: "text", placeholder: "YYYY-MM-DD" },
                    { label: "Lieu de naissance", key: "lieu_naissance", type: "text" },
                  ].map((f) => (
                    <label key={f.key} className={`text-xs font-medium text-gray-500 ${f.key === "lieu_naissance" ? "sm:col-span-2" : ""}`}>
                      {f.label}
                      <input type={f.type} value={(editForm as Record<string, string>)[f.key]} onChange={(e) => setEditForm({ ...editForm, [f.key]: e.target.value })}
                        placeholder={f.placeholder}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-midnight_text outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" />
                    </label>
                  ))}
                  <label className="text-xs font-medium text-gray-500">Sexe
                    <select value={editForm.sexe} onChange={(e) => setEditForm({ ...editForm, sexe: e.target.value })}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-midnight_text outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                      <option value="M">Masculin</option><option value="F">Féminin</option>
                    </select>
                  </label>
                  {autorizations.canUpdateStatus && (
                    <label className="text-xs font-medium text-gray-500 sm:col-span-2">
                      <Icon icon="solar:flag-linear" className="mr-1 inline-block size-3.5" />Statut d&apos;inscription
                      <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-midnight_text outline-none transition focus:border-primary focus:ring-1 focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white">
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                      </select>
                    </label>
                  )}
                </section>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-5 py-4 dark:border-gray-700">
              <button type="button" onClick={closeEdit}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800">Annuler</button>
              <button type="button" onClick={() => void saveEdit()} disabled={busy === "save" || busy === "photo"}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-darkprimary disabled:opacity-50">
                {busy === "save" ? <><Icon icon="solar:spinner-bold" className="size-3.5 animate-spin" />Enregistrement…</>
                  : <><Icon icon="solar:diskette-linear" className="size-3.5" />Enregistrer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageListe>
  );
}
