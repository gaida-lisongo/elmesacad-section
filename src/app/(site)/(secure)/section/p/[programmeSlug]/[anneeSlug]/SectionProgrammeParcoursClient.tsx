"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PageListe } from "@/components/Layout/PageListe";
import {
  createParcoursBulkStudentService,
  deleteParcoursBulkStudentService,
  listParcoursStudentService,
  patchParcoursBulkStudentService,
  updateParcoursStudentService,
} from "@/actions/gestionnaireParcours";

type CtxResponse = {
  message?: string;
  scope?: { sectionDesignation?: string; sectionSlug?: string };
  programme?: { designation?: string; slug?: string; credits?: number };
  annee?: { slug?: string; designation?: string; debut?: string; fin?: string };
  canCreateDelete?: boolean;
  canUpdateStatus?: boolean;
};

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

const PAGE_SIZE = 40;
const STATUS_OPTIONS = ["inscrit", "suspendu", "abandon", "diplômé"] as const;

function statusLabel(value: string): string {
  switch (value) {
    case "inscrit":
      return "Inscrit";
    case "suspendu":
      return "Suspendu";
    case "abandon":
      return "Abandon";
    case "diplômé":
      return "Finaliste";
    default:
      return value || "—";
  }
}

function statusCardTone(value: string): string {
  switch (value) {
    case "inscrit":
      return "border-emerald-200 bg-emerald-50/30 dark:border-emerald-900/50";
    case "suspendu":
      return "border-amber-200 bg-amber-50/30 dark:border-amber-900/50";
    case "abandon":
      return "border-rose-200 bg-rose-50/30 dark:border-rose-900/50";
    case "diplômé":
      return "border-sky-200 bg-sky-50/30 dark:border-sky-900/50";
    default:
      return "border-gray-200 dark:border-gray-700";
  }
}

function normalizeHeader(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(text: string): CsvDraftRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length <= 1) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter).map(normalizeHeader);
  const indexOf = (aliases: string[]) => headers.findIndex((h) => aliases.includes(h));
  const idxNom = indexOf(["nom", "nomcomplet"]);
  const idxMatricule = indexOf(["matricule"]);
  const idxSexe = indexOf(["sexe"]);
  const idxNationalite = indexOf(["nationalite", "natiobnalite"]);
  const idxDateNaissance = indexOf(["datenaissance"]);
  const idxLieuNaissance = indexOf(["lieudenaissance", "lieunaissance"]);
  const idxEmail = indexOf(["email", "mail"]);
  return lines.slice(1).flatMap((line) => {
    const cols = splitCsvLine(line, delimiter);
    const row: CsvDraftRow = {
      nomComplet: idxNom >= 0 ? String(cols[idxNom] ?? "").trim() : "",
      matricule: idxMatricule >= 0 ? String(cols[idxMatricule] ?? "").trim() : "",
      sexe: idxSexe >= 0 ? String(cols[idxSexe] ?? "M").trim().toUpperCase() : "M",
      nationalite: idxNationalite >= 0 ? String(cols[idxNationalite] ?? "").trim() : "",
      date_naissance: idxDateNaissance >= 0 ? String(cols[idxDateNaissance] ?? "").trim() : "",
      lieu_naissance: idxLieuNaissance >= 0 ? String(cols[idxLieuNaissance] ?? "").trim() : "",
      email: idxEmail >= 0 ? String(cols[idxEmail] ?? "").trim().toLowerCase() : "",
    };
    if (!row.nomComplet || !row.matricule || !row.email) return [];
    row.sexe = row.sexe === "F" ? "F" : "M";
    return [row];
  });
}

function normalizeParcoursRow(raw: Record<string, unknown>): ParcoursRow {
  const student = (raw.student ?? {}) as Record<string, unknown>;
  return {
    id: String(raw._id ?? raw.id ?? ""),
    nomComplet: String(student.nomComplet ?? "—"),
    matricule: String(student.matricule ?? "—"),
    email: String(student.email ?? "—"),
    sexe: String(student.sexe ?? "M"),
    nationalite: String(student.nationalite ?? ""),
    date_naissance: String(student.date_naissance ?? ""),
    lieu_naissance: String(student.lieu_naissance ?? ""),
    photo: String(student.photo ?? ""),
    status: String(raw.status ?? "—"),
    reference: String(raw.reference ?? "—"),
  };
}

function getInitials(fullName: string): string {
  const parts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "ET";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function formatDateFr(input: string): string {
  const raw = String(input ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export default function SectionProgrammeParcoursClient({
  programmeSlug,
  anneeSlug,
}: {
  programmeSlug: string;
  anneeSlug: string;
}) {
  const [ctx, setCtx] = useState<CtxResponse | null>(null);
  const [rows, setRows] = useState<ParcoursRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [bulkStatus, setBulkStatus] = useState("inscrit");
  const [csvRows, setCsvRows] = useState<CsvDraftRow[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<ParcoursRow | null>(null);
  const [editForm, setEditForm] = useState<ParcoursRow | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const ctxRes = await fetch(
        `/api/section/parcours/context?programmeSlug=${encodeURIComponent(programmeSlug)}&anneeSlug=${encodeURIComponent(
          anneeSlug
        )}`
      );
      const ctxPayload = (await ctxRes.json()) as CtxResponse;
      if (!ctxRes.ok) throw new Error(ctxPayload.message || "Contexte indisponible");
      setCtx(ctxPayload);

      const list = await listParcoursStudentService({
        anneeSlug,
        filiereSlug: String(ctxPayload.scope?.sectionSlug ?? ""),
        classeSlug: programmeSlug,
        search: search.trim(),
        status: statusFilter || undefined,
        page: page + 1,
        limit: PAGE_SIZE,
      });
      setRows((list.data ?? []).map((x) => normalizeParcoursRow(x as Record<string, unknown>)));
      setTotal(list.total ?? 0);
    } catch (error) {
      setRows([]);
      setTotal(0);
      setErr((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [programmeSlug, anneeSlug, search, statusFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const allPageSelected = rows.length > 0 && rows.every((r) => selectedIds.includes(r.id));
  const toggleAllPage = () => {
    if (allPageSelected) {
      setSelectedIds((prev) => prev.filter((id) => !rows.some((r) => r.id === id)));
      return;
    }
    setSelectedIds((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => next.add(r.id));
      return [...next];
    });
  };

  const onCsvSelected = async (file: File | null) => {
    if (!file) return;
    const text = await file.text();
    setCsvRows(parseCsv(text));
  };

  const downloadTemplate = () => {
    const headers = ["Nom", "Matricule", "Sexe", "Nationalite", "Date_naissance", "Lieu de Naissance", "Email"];
    const sample = ["KABILA Moise", "2026001", "M", "CD", "2000-01-15", "Kinshasa", "etudiant@example.com"];
    const csv = `${headers.join(";")}\n${sample.join(";")}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template-parcours.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const createBulk = async () => {
    if (!ctx?.canCreateDelete || csvRows.length === 0) return;
    setBusy("create");
    setProgress(0);
    setErr(null);
    try {
      const chunkSize = 100;
      const chunks = Math.ceil(csvRows.length / chunkSize);
      for (let i = 0; i < chunks; i += 1) {
        const chunk = csvRows.slice(i * chunkSize, (i + 1) * chunkSize);
        const payload = chunk.map((row, idx) => ({
          student: {
            email: row.email,
            matricule: row.matricule,
            sexe: row.sexe,
            nomComplet: row.nomComplet,
            photo: "",
            nationalite: row.nationalite,
            date_naissance: row.date_naissance,
            lieu_naissance: row.lieu_naissance,
          },
          programme: {
            classe: String(ctx.programme?.slug ?? programmeSlug),
            filiere: String(ctx.scope?.sectionSlug ?? ""),
            credits: Number(ctx.programme?.credits ?? 0),
          },
          annee: {
            debut: String(ctx.annee?.debut ?? ""),
            fin: String(ctx.annee?.fin ?? ""),
            slug: String(ctx.annee?.slug ?? anneeSlug),
          },
          status: "suspendu",
          ncv: 0,
          reference: `${String(ctx.annee?.slug ?? anneeSlug)}/${String(ctx.programme?.slug ?? programmeSlug)}/${row.matricule}/${Date.now()}${idx}`,
        }));
        await createParcoursBulkStudentService(payload);
        setProgress(Math.round(((i + 1) / chunks) * 100));
      }
      setCsvRows([]);
      await load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const patchBulk = async () => {
    if (!ctx?.canUpdateStatus || selectedIds.length === 0) return;
    setBusy("patch");
    setErr(null);
    try {
      await patchParcoursBulkStudentService(selectedIds.map((id) => ({ _id: id, status: bulkStatus })));
      setSelectedIds([]);
      await load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const deleteBulk = async () => {
    if (!ctx?.canCreateDelete || selectedIds.length === 0) return;
    setBusy("delete");
    setErr(null);
    try {
      await deleteParcoursBulkStudentService(selectedIds);
      setSelectedIds([]);
      await load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const openEdit = (row: ParcoursRow) => {
    setEditing(row);
    setEditForm({ ...row });
  };

  const closeEdit = () => {
    if (busy === "save" || busy === "photo") return;
    setEditing(null);
    setEditForm(null);
  };

  const uploadPhoto = async (file: File | null) => {
    if (!file || !editForm) return;
    setBusy("photo");
    setErr(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/section/parcours/upload-photo", { method: "POST", body: fd });
      const payload = (await res.json().catch(() => ({}))) as { photo?: string; message?: string };
      if (!res.ok) throw new Error(payload.message || "Upload photo impossible");
      if (payload.photo) {
        setEditForm((prev) => (prev ? { ...prev, photo: payload.photo } : prev));
      }
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setBusy("save");
    setErr(null);
    try {
      await updateParcoursStudentService({
        id: editForm.id,
        student: {
          nomComplet: editForm.nomComplet.trim(),
          email: editForm.email.trim().toLowerCase(),
          matricule: editForm.matricule.trim(),
          sexe: editForm.sexe.trim().toUpperCase() === "F" ? "F" : "M",
          nationalite: editForm.nationalite.trim(),
          date_naissance: editForm.date_naissance.trim(),
          lieu_naissance: editForm.lieu_naissance.trim(),
          photo: editForm.photo.trim(),
        },
        ...(ctx?.canUpdateStatus ? { status: editForm.status } : {}),
      });
      closeEdit();
      await load();
    } catch (error) {
      setErr((error as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageListe
      heading={
        <div>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white">
            Parcours - {ctx?.programme?.designation || programmeSlug}
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Section {ctx?.scope?.sectionDesignation || "—"} · Année {ctx?.annee?.slug || anneeSlug}
          </p>
        </div>
      }
      sidebar={
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <p className="text-xs font-semibold uppercase text-gray-500">Statuts</p>
            <div className="mt-2 space-y-1">
              <button
                type="button"
                onClick={() => {
                  setPage(0);
                  setStatusFilter("");
                }}
                className={`block w-full rounded px-2 py-1 text-left text-xs ${statusFilter === "" ? "bg-emerald-100 dark:bg-emerald-900/40" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
              >
                Tous
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setPage(0);
                    setStatusFilter(s);
                  }}
                  className={`block w-full rounded px-2 py-1 text-left text-xs ${statusFilter === s ? "bg-emerald-100 dark:bg-emerald-900/40" : "hover:bg-gray-50 dark:hover:bg-gray-800"}`}
                >
                  {statusLabel(s)}
                </button>
              ))}
            </div>
          </div>
          {ctx?.canCreateDelete && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
              <p className="text-xs font-semibold uppercase text-gray-500">Création bulk CSV (Appariteur)</p>
              <p className="mt-2 text-xs text-gray-500">1) Télécharger le modèle CSV</p>
              <button
                type="button"
                onClick={downloadTemplate}
                className="mt-1 rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/30"
              >
                Télécharger le template
              </button>
              <p className="mt-3 text-xs text-gray-500">2) Charger le fichier</p>
              <input
                className="mt-1 block w-full text-xs"
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => void onCsvSelected(e.target.files?.[0] ?? null)}
              />
              <p className="mt-3 text-xs text-gray-500">3) Envoyer vers STUDENT_SERVICE</p>
              <button
                type="button"
                onClick={() => void createBulk()}
                disabled={busy === "create" || csvRows.length === 0}
                className="mt-2 rounded bg-[#082b1c] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                Importer ({csvRows.length})
              </button>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
          {!ctx?.canCreateDelete && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
              Création/suppression désactivée: réservé à l&apos;appariteur.
            </div>
          )}
          {!ctx?.canUpdateStatus && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-xs text-sky-900 dark:border-sky-800 dark:bg-sky-950/30 dark:text-sky-100">
              Mise à jour de statut désactivée: réservée au secrétaire.
            </div>
          )}
        </div>
      }
    >
      {err && <p className="rounded border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{err}</p>}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setPage(0);
              setSearch(e.target.value);
            }}
            placeholder="Recherche par matricule ou nom..."
            className="min-w-[14rem] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm outline-none focus:border-[#082b1c] dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <button
            type="button"
            onClick={toggleAllPage}
            className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold dark:border-gray-700"
            disabled={rows.length === 0}
          >
            {allPageSelected ? "Tout désélectionner" : "Tout sélectionner"}
          </button>
          {ctx?.canUpdateStatus && (
            <>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="rounded-md border border-gray-300 px-2 py-2 text-xs dark:border-gray-700 dark:bg-gray-800"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {statusLabel(s)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void patchBulk()}
                disabled={busy === "patch" || selectedIds.length === 0}
                className="rounded-md bg-[#082b1c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                Appliquer statut ({selectedIds.length})
              </button>
            </>
          )}
          {ctx?.canCreateDelete && (
            <button
              type="button"
              onClick={() => void deleteBulk()}
              disabled={busy === "delete" || selectedIds.length === 0}
              className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-50"
            >
              Supprimer sélection ({selectedIds.length})
            </button>
          )}
        </div>

        {loading ? (
          <p className="text-sm text-gray-500">Chargement des étudiants...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-500">Aucun parcours.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {rows.map((row) => {
              const selected = selectedIds.includes(row.id);
              return (
                <article
                  key={row.id}
                  className={`w-full rounded-2xl border p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:bg-gray-900 ${
                    selected
                      ? "border-emerald-400 dark:border-emerald-500"
                      : statusCardTone(row.status)
                  }`}
                >
                  <div className="grid gap-3 sm:grid-cols-[96px_minmax(0,1fr)]">
                    <div className="relative h-24 w-full overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800">
                      {row.photo ? (
                        <img src={row.photo} alt={row.nomComplet} className="h-full w-full object-cover" />
                      ) : null}
                      {!row.photo && (
                        <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-600 dark:text-gray-300">
                          {getInitials(row.nomComplet)}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() =>
                              setSelectedIds((prev) =>
                                prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                              )
                            }
                            className="mt-1 rounded border-gray-300"
                            onClick={(e) => e.stopPropagation()}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">{row.nomComplet}</p>
                            <p className="truncate text-xs text-gray-500">{row.email}</p>
                          </div>
                        </label>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {statusLabel(row.status)}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>
                          Matricule: <span className="font-mono">{row.matricule}</span>
                        </span>
                        <span>
                          Naissance: <span className="font-medium">{formatDateFr(row.date_naissance)}</span>
                        </span>
                        <span>
                          Sexe: <span className="font-medium">{row.sexe || "—"}</span>
                        </span>
                        <span>
                          Lieu: <span className="font-medium">{row.lieu_naissance || "—"}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => openEdit(row)}
                        className="mt-3 rounded-md border border-gray-300 px-2.5 py-1 text-xs font-semibold transition hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
                      >
                        Modifier l'étudiant
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-400">
          <span>
            {total} résultat{total > 1 ? "s" : ""} — page {page + 1} / {Math.max(1, Math.ceil(total / PAGE_SIZE) || 1)}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page <= 0 || loading}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Précédent
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading || (page + 1) * PAGE_SIZE >= total || total === 0}
              className="rounded-md border border-gray-300 px-3 py-1.5 font-medium transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              Suivant
            </button>
          </div>
        </div>
      </section>

      {editing && editForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 p-3">
          <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-700">
              <div>
                <h3 className="text-base font-semibold text-midnight_text dark:text-white">Référence: {editing.reference}</h3>
                <p className="text-[11px] text-gray-500">Référence non modifiable</p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-gray-300 px-2 py-1 text-xs dark:border-gray-600"
              >
                Fermer
              </button>
            </div>
            <div className="space-y-4 px-4 py-4">
              <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
                <section className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800/40">
                  <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Photo</p>
                  <div className="relative h-44 w-full overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                    {editForm.photo ? (
                      <img src={editForm.photo} alt={editForm.nomComplet} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-gray-500">
                        {getInitials(editForm.nomComplet)}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="absolute left-2 top-2 rounded-md bg-black/65 px-2 py-1 text-[11px] font-semibold text-white"
                    >
                      Modifier
                    </button>
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept=".jpg,.jpeg,.png,.webp,.gif,image/*"
                      className="hidden"
                      onChange={(e) => void uploadPhoto(e.target.files?.[0] ?? null)}
                    />
                  </div>
                </section>
                <section className="grid gap-3 md:grid-cols-2">
                <label className="text-xs text-gray-500">
                  Nom complet
                  <input
                    value={editForm.nomComplet}
                    onChange={(e) => setEditForm({ ...editForm, nomComplet: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Email
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Matricule
                  <input
                    value={editForm.matricule}
                    onChange={(e) => setEditForm({ ...editForm, matricule: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Sexe
                  <select
                    value={editForm.sexe}
                    onChange={(e) => setEditForm({ ...editForm, sexe: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <option value="M">M</option>
                    <option value="F">F</option>
                  </select>
                </label>
                <label className="text-xs text-gray-500">
                  Nationalité
                  <input
                    value={editForm.nationalite}
                    onChange={(e) => setEditForm({ ...editForm, nationalite: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Date de naissance
                  <input
                    value={editForm.date_naissance}
                    onChange={(e) => setEditForm({ ...editForm, date_naissance: e.target.value })}
                    placeholder="YYYY-MM-DD"
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-500 md:col-span-2">
                  Lieu de naissance
                  <input
                    value={editForm.lieu_naissance}
                    onChange={(e) => setEditForm({ ...editForm, lieu_naissance: e.target.value })}
                    className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                  />
                </label>
                {ctx?.canUpdateStatus && (
                  <label className="text-xs text-gray-500 md:col-span-2">
                    Statut d'inscription (secrétaire uniquement)
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                </section>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-gray-200 px-4 py-3 dark:border-gray-700">
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-md border border-gray-300 px-3 py-2 text-xs font-semibold dark:border-gray-600"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void saveEdit()}
                disabled={busy === "save" || busy === "photo"}
                className="rounded-md bg-[#082b1c] px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {busy === "save" ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageListe>
  );
}
