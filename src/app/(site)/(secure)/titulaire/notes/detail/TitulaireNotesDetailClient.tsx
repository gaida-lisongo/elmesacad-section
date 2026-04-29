"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bulkCreateTitulaireNotes,
  fetchCourseNotesForTitulaire,
  fetchRawNoteLinesForCourse,
  updateTitulaireNoteLine,
  type TitulaireNoteLinePayload,
} from "@/actions/titulaireNotesWorkflow";
import { getTransientParcoursCache } from "@/lib/notes/transientParcoursCache";

type NoteType = "cc" | "examen" | "rattrapage" | "rachat";

type StudentRow = {
  id: string;
  matricule: string;
  email: string;
  nomComplet: string;
  studentId: string;
  status?: string;
  anneeDesignation?: string;
  programmeDesignation?: string;
  photo?: string;
  sexe?: string;
  nationalite?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  raw: Record<string, unknown>;
};

type DetailRow = StudentRow & {
  noteId?: string;
  hasExistingNote: boolean;
  values: Record<NoteType, number>;
  context?: {
    semestre: { designation: string; reference: string; credit: number };
    unite: { designation: string; reference: string; code?: string; credit: number };
    matiere: { designation: string; reference: string; credit: number };
  };
};

type NoteDraft = Partial<Record<NoteType, number>>;
type NoteInputs = Partial<Record<NoteType, string>>;
type ImportRow = Record<string, string>;

function toNum(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatDateFr(input?: string): string {
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

function parseCsv(text: string): Array<Record<string, string>> {
  const lines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const split = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === delimiter && !inQuotes) {
        out.push(cur.trim());
        cur = "";
      } else {
        cur += ch;
      }
    }
    out.push(cur.trim());
    return out;
  };
  const headers = split(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cols = split(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = cols[i] ?? "";
    });
    return row;
  });
}

function toStudentRow(raw: unknown): StudentRow {
  const x = (raw ?? {}) as Record<string, unknown>;
  const st = (x.student ?? {}) as Record<string, unknown>;
  const fullName = String(
    st.name ??
      st.nomComplet ??
      x.studentName ??
      x.nomComplet ??
      `${String(st.firstName ?? "").trim()} ${String(st.lastName ?? "").trim()}`.trim() ??
      "—"
  ).trim();
  return {
    id: String(x._id ?? x.id ?? x.reference ?? ""),
    matricule: String(st.matricule ?? x.matricule ?? ""),
    email: String(st.mail ?? st.email ?? x.email ?? ""),
    nomComplet: fullName || "—",
    studentId: String(x.reference ?? x.studentId ?? ""),
    status: String(x.status ?? "").trim().toLowerCase(),
    anneeDesignation: String(((x.annee ?? {}) as Record<string, unknown>).designation ?? ""),
    programmeDesignation: String(((x.programme ?? {}) as Record<string, unknown>).designation ?? ""),
    photo: String(st.photo ?? ""),
    sexe: String(st.sexe ?? ""),
    nationalite: String(st.nationalite ?? ""),
    dateNaissance: String(st.date_naissance ?? ""),
    lieuNaissance: String(st.lieu_naissance ?? ""),
    raw: x,
  };
}

function extractElementAndContext(raw: Record<string, unknown>, matiereRef: string) {
  const semestres = Array.isArray(raw.semestres) ? raw.semestres : [];
  for (const sem of semestres as Array<Record<string, unknown>>) {
    const unites = Array.isArray(sem.unites) ? sem.unites : [];
    for (const unit of unites as Array<Record<string, unknown>>) {
      const elements = Array.isArray(unit.elements) ? unit.elements : [];
      const found = (elements as Array<Record<string, unknown>>).find(
        (el) => String(el._id ?? el.reference ?? "").trim() === matiereRef
      );
      if (!found) continue;
      return {
        element: found,
        context: {
          semestre: {
            designation: String(sem.designation ?? ""),
            reference: String(sem._id ?? sem.reference ?? ""),
            credit: toNum(sem.credit),
          },
          unite: {
            designation: String(unit.designation ?? ""),
            reference: String(unit._id ?? unit.reference ?? ""),
            code: String(unit.code ?? ""),
            credit: toNum(unit.credit),
          },
          matiere: {
            designation: String(found.designation ?? ""),
            reference: String(found._id ?? found.reference ?? ""),
            credit: toNum(found.credit),
          },
        },
      };
    }
  }
  return null;
}

function computeTotal(values: Record<NoteType, number>): number {
  const cc = Number(values.cc ?? 0);
  const examen = Number(values.examen ?? 0);
  const rattrapage = Number(values.rattrapage ?? 0);
  const rachat = Number(values.rachat ?? 0);
  if (rachat > 0) return rachat;
  const ccExamen = cc + examen;
  return ccExamen > rattrapage ? ccExamen : rattrapage;
}

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

export default function TitulaireNotesDetailClient(props: {
  anneeSlug: string;
  programmeRef: string;
  matiereRef: string;
  cacheKey: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<DetailRow[]>([]);
  const [inputs, setInputs] = useState<Record<string, NoteInputs>>({});
  const [staged, setStaged] = useState<Record<string, NoteDraft>>({});
  const [csvText, setCsvText] = useState("");
  const [csvFileName, setCsvFileName] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importStep, setImportStep] = useState<1 | 2 | 3>(1);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importHeaders, setImportHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<{
    email?: string;
    nom?: string;
    cc?: string;
    examen?: string;
    rattrapage?: string;
    rachat?: string;
  }>({});
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function run() {
      setLoading(true);
      setError(null);
      setMessage(null);
      try {
        const rawParcours = getTransientParcoursCache<unknown[]>(props.cacheKey) ?? [];
        const students = rawParcours
          .map(toStudentRow)
          .filter(
            (x) =>
              x.matricule &&
              ((x.status ?? "").startsWith("inscrit") ||
                (x.status ?? "").includes("dipl"))
          );
        const courseRaw = await fetchCourseNotesForTitulaire(props.matiereRef);
        const rawLines = await fetchRawNoteLinesForCourse({
          courseRef: props.matiereRef,
          matricules: students.map((s) => s.matricule),
        });
        const lineByMatricule = new Map(
          rawLines.map((x) => [String((x as Record<string, unknown>).matricule ?? ""), x as Record<string, unknown>] as const)
        );
        const byMatricule = new Map(
          courseRaw.map((r) => {
            const x = (r ?? {}) as Record<string, unknown>;
            return [String(x.matricule ?? ""), x] as const;
          })
        );

        const mapped: DetailRow[] = students.map((s) => {
          const remote = byMatricule.get(s.matricule) ?? {};
          const pick = extractElementAndContext(remote, props.matiereRef);
          const line = lineByMatricule.get(s.matricule);
          const values = {
            cc: toNum(line?.cc ?? pick?.element.cc),
            examen: toNum(line?.examen ?? pick?.element.examen),
            rattrapage: toNum(line?.rattrapage ?? pick?.element.rattrapage),
            rachat: toNum(line?.rachat ?? pick?.element.rachat),
          };
          return {
            ...s,
            noteId: String(line?._id ?? ""),
            hasExistingNote: Boolean(line?._id),
            values,
            context: pick?.context,
          };
        });
        setRows(mapped);
        setInputs(
          Object.fromEntries(
            mapped.map((r) => [
              r.id,
              {
                cc: r.hasExistingNote ? String(r.values.cc) : "",
                examen: r.hasExistingNote ? String(r.values.examen) : "",
                rattrapage: r.hasExistingNote ? String(r.values.rattrapage) : "",
                rachat: r.hasExistingNote ? String(r.values.rachat) : "",
              },
            ])
          )
        );
      } catch (e) {
        setError((e as Error).message || "Erreur de chargement.");
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [props.cacheKey, props.matiereRef]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.matricule.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.nomComplet.toLowerCase().includes(q)
    );
  }, [rows, search]);
  const noStudentAvailable = !loading && !error && rows.length === 0;
  const parcoursCount = rows.length;
  const totalCotesPossible = parcoursCount * 4;
  const cotesDisponiblesCount = useMemo(() => {
    const keys: NoteType[] = ["cc", "examen", "rattrapage", "rachat"];
    let count = 0;
    for (const row of rows) {
      for (const key of keys) {
        const draft = staged[row.id];
        if (draft && hasOwn(draft, key)) {
          count += 1;
          continue;
        }
        if (row.hasExistingNote) {
          count += 1;
        }
      }
    }
    return count;
  }, [rows, staged]);
  const courseDesignation = useMemo(
    () => rows.find((r) => r.context?.matiere.designation?.trim())?.context?.matiere.designation || "—",
    [rows]
  );
  const courseCredit = useMemo(
    () => rows.find((r) => typeof r.context?.matiere.credit === "number")?.context?.matiere.credit ?? 0,
    [rows]
  );
  const bestStudent = useMemo(() => {
    const candidates = rows.filter((r) => r.hasExistingNote || Boolean(staged[r.id] && Object.keys(staged[r.id]).length));
    if (candidates.length === 0) return null;
    let best = candidates[0];
    let bestTotal = computeTotal({
      cc: staged[best.id]?.cc ?? best.values.cc,
      examen: staged[best.id]?.examen ?? best.values.examen,
      rattrapage: staged[best.id]?.rattrapage ?? best.values.rattrapage,
      rachat: staged[best.id]?.rachat ?? best.values.rachat,
    });
    for (const row of candidates.slice(1)) {
      const total = computeTotal({
        cc: staged[row.id]?.cc ?? row.values.cc,
        examen: staged[row.id]?.examen ?? row.values.examen,
        rattrapage: staged[row.id]?.rattrapage ?? row.values.rattrapage,
        rachat: staged[row.id]?.rachat ?? row.values.rachat,
      });
      if (total > bestTotal) {
        best = row;
        bestTotal = total;
      }
    }
    return { name: best.nomComplet || "—", total: bestTotal };
  }, [rows, staged]);
  const worstStudent = useMemo(() => {
    const candidates = rows.filter((r) => r.hasExistingNote || Boolean(staged[r.id] && Object.keys(staged[r.id]).length));
    if (candidates.length === 0) return null;
    let worst = candidates[0];
    let worstTotal = computeTotal({
      cc: staged[worst.id]?.cc ?? worst.values.cc,
      examen: staged[worst.id]?.examen ?? worst.values.examen,
      rattrapage: staged[worst.id]?.rattrapage ?? worst.values.rattrapage,
      rachat: staged[worst.id]?.rachat ?? worst.values.rachat,
    });
    for (const row of candidates.slice(1)) {
      const total = computeTotal({
        cc: staged[row.id]?.cc ?? row.values.cc,
        examen: staged[row.id]?.examen ?? row.values.examen,
        rattrapage: staged[row.id]?.rattrapage ?? row.values.rattrapage,
        rachat: staged[row.id]?.rachat ?? row.values.rachat,
      });
      if (total < worstTotal) {
        worst = row;
        worstTotal = total;
      }
    }
    return { name: worst.nomComplet || "—", total: worstTotal };
  }, [rows, staged]);

  function exportCsv() {
    const header = "matricule,email,nomComplet,cc,examen,rattrapage,rachat";
    const body = filtered
      .map((r) => {
        const i = inputs[r.id] ?? {};
        return [
          r.matricule,
          r.email,
          r.nomComplet,
          i.cc ?? r.values.cc,
          i.examen ?? r.values.examen,
          i.rattrapage ?? r.values.rattrapage,
          i.rachat ?? r.values.rachat,
        ].join(",");
      })
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fiche-cotation-${props.matiereRef}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function saveAll() {
    const entries = Object.entries(staged).filter(([, d]) => Object.keys(d).length > 0);
    if (entries.length === 0) {
      setMessage("Aucune modification à enregistrer.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const byId = new Map(rows.map((r) => [r.id, r]));
      const creates: TitulaireNoteLinePayload[] = [];
      for (const [id, draft] of entries) {
        const row = byId.get(id);
        if (!row) continue;
        const cleanPatch: Partial<TitulaireNoteLinePayload> = {};
        for (const key of ["cc", "examen", "rattrapage", "rachat"] as NoteType[]) {
          const val = draft[key];
          if (typeof val === "number" && Number.isFinite(val)) {
            cleanPatch[key] = val;
          }
        }
        if (Object.keys(cleanPatch).length === 0) continue;
        if (row.hasExistingNote && row.noteId) {
          await updateTitulaireNoteLine(row.noteId, cleanPatch);
        } else {
          if (!row.context) continue;
          creates.push({
            email: row.email,
            matricule: row.matricule,
            studentId: row.studentId,
            studentName: row.nomComplet,
            semestre: row.context.semestre,
            unite: row.context.unite,
            matiere: row.context.matiere,
            cc: (cleanPatch.cc as number | undefined) ?? row.values.cc ?? 0,
            examen: (cleanPatch.examen as number | undefined) ?? row.values.examen ?? 0,
            rattrapage: (cleanPatch.rattrapage as number | undefined) ?? row.values.rattrapage ?? 0,
            rachat: (cleanPatch.rachat as number | undefined) ?? row.values.rachat ?? 0,
          });
        }
      }
      if (creates.length > 0) {
        await bulkCreateTitulaireNotes(creates);
      }
      setRows((prev) =>
        prev.map((r) => {
          const d = staged[r.id];
          if (!d) return r;
          return {
            ...r,
            hasExistingNote: true,
            values: {
              ...r.values,
              cc: d.cc ?? r.values.cc,
              examen: d.examen ?? r.values.examen,
              rattrapage: d.rattrapage ?? r.values.rattrapage,
              rachat: d.rachat ?? r.values.rachat,
            },
          };
        })
      );
      setStaged({});
      setMessage("Enregistrement terminé.");
    } catch (e) {
      setError((e as Error).message || "Échec d'enregistrement.");
    } finally {
      setSaving(false);
    }
  }

  async function importCsv() {
    setError(null);
    setMessage(null);
    const records = parseCsv(csvText);
    if (records.length === 0) {
      setError("CSV vide ou invalide.");
      return;
    }
    const byMatricule = new Map(rows.map((r) => [r.matricule.toLowerCase(), r]));
    const byEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));
    for (const rec of records) {
      const keyMatricule = String(rec.matricule ?? "").toLowerCase();
      const keyEmail = String(rec.email ?? "").toLowerCase();
      const target = byMatricule.get(keyMatricule) ?? byEmail.get(keyEmail);
      if (!target) continue;
      const nextDraft: NoteDraft = {};
      const nextInputs: NoteInputs = {};
      for (const key of ["cc", "examen", "rattrapage", "rachat"] as NoteType[]) {
        const raw = String(rec[key] ?? "").trim();
        if (!raw || raw.toUpperCase() === "X") continue;
        const num = Number(raw.replace(",", "."));
        if (!Number.isFinite(num) || num < 0 || num > 20) continue;
        nextDraft[key] = num;
        nextInputs[key] = String(num);
      }
      if (Object.keys(nextDraft).length === 0) continue;
      setStaged((prev) => ({ ...prev, [target.id]: { ...(prev[target.id] ?? {}), ...nextDraft } }));
      setInputs((prev) => ({ ...prev, [target.id]: { ...(prev[target.id] ?? {}), ...nextInputs } }));
    }
    setShowImportModal(false);
    setMessage("Import chargé dans le brouillon. Cliquez sur Enregistrer pour envoyer.");
  }

  function downloadImportTemplate() {
    const header = "Email,Nom,CC,EXAMEN,RATTRAPAGE,RACHAT";
    const lines = filtered.map((r) => {
      const email = String(r.email ?? "").replace(/"/g, '""');
      const nom = String(r.nomComplet ?? "").replace(/"/g, '""');
      return `"${email}","${nom}",,,,\n`;
    });
    const csv = `${header}\n${lines.join("")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modele-cotation.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function startImportStep2() {
    const rowsParsed = parseCsv(csvText);
    if (rowsParsed.length === 0) {
      setError("Fichier import vide ou invalide.");
      return;
    }
    setImportRows(rowsParsed);
    setImportHeaders(Object.keys(rowsParsed[0] ?? {}));
    setMapping({});
    setImportInfo(`${rowsParsed.length} ligne(s) détectée(s).`);
    setImportStep(2);
  }

  async function onPickCsvFile(file: File | null) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) {
      setError("Veuillez sélectionner un fichier .csv");
      return;
    }
    setError(null);
    setCsvFileName(file.name);
    const text = await file.text();
    setCsvText(text);
    setImportInfo(`Fichier chargé: ${file.name}`);
  }

  async function runImportStep3() {
    if (importRows.length === 0) return;
    setImporting(true);
    setError(null);
    setImportInfo("Construction de la payload...");
    try {
      const byEmail = new Map(rows.map((r) => [r.email.toLowerCase(), r]));
      const lines: TitulaireNoteLinePayload[] = [];
      for (const row of importRows) {
        const emailCol = mapping.email;
        const emailVal = String(emailCol ? row[emailCol] ?? "" : "").trim().toLowerCase();
        if (!emailVal) continue;
        const target = byEmail.get(emailVal);
        if (!target?.context) continue;
        const getVal = (field?: string) => {
          const raw = String(field ? row[field] ?? "" : "").trim();
          if (!raw || raw.toUpperCase() === "X") return null;
          const n = Number(raw.replace(",", "."));
          if (!Number.isFinite(n) || n < 0 || n > 20) return null;
          return n;
        };
        const cc = getVal(mapping.cc);
        const examen = getVal(mapping.examen);
        const rattrapage = getVal(mapping.rattrapage);
        const rachat = getVal(mapping.rachat);
        if (cc == null && examen == null && rattrapage == null && rachat == null) continue;
        lines.push({
          email: target.email,
          matricule: target.matricule,
          studentId: target.studentId,
          studentName: target.nomComplet,
          semestre: target.context.semestre,
          unite: target.context.unite,
          matiere: target.context.matiere,
          cc: cc ?? target.values.cc ?? 0,
          examen: examen ?? target.values.examen ?? 0,
          rattrapage: rattrapage ?? target.values.rattrapage ?? 0,
          rachat: rachat ?? target.values.rachat ?? 0,
        });
      }
      const total = lines.length;
      if (total === 0) {
        setImportInfo("Aucune ligne valide après mapping.");
        return;
      }
      const batchCount = 10;
      const chunkSize = Math.max(1, Math.ceil(total / batchCount));
      let sent = 0;
      for (let i = 0; i < batchCount; i += 1) {
        const chunk = lines.slice(i * chunkSize, i * chunkSize + chunkSize);
        if (chunk.length === 0) continue;
        setImportInfo(`Envoi lot ${i + 1}/${batchCount}...`);
        const res = await bulkCreateTitulaireNotes(chunk);
        sent += res.count;
      }
      setImportInfo(`Import terminé: ${sent}/${total} ligne(s) envoyée(s).`);
      setShowImportModal(false);
      setMessage(`Import terminé: ${sent}/${total} ligne(s) envoyée(s).`);
      setCsvText("");
      setImportRows([]);
      setImportHeaders([]);
      setImportStep(1);
      setMapping({});
      const rawParcours = getTransientParcoursCache<unknown[]>(props.cacheKey) ?? [];
      const students = rawParcours.map(toStudentRow).filter((x) => x.matricule);
      const rawLines = await fetchRawNoteLinesForCourse({
        courseRef: props.matiereRef,
        matricules: students.map((s) => s.matricule),
      });
      const lineByMatricule = new Map(
        rawLines.map((x) => [String((x as Record<string, unknown>).matricule ?? ""), x as Record<string, unknown>] as const)
      );
      setRows((prev) =>
        prev.map((r) => {
          const line = lineByMatricule.get(r.matricule);
          if (!line) return r;
          return {
            ...r,
            hasExistingNote: Boolean(line._id),
            noteId: String(line._id ?? ""),
            values: {
              cc: toNum(line.cc),
              examen: toNum(line.examen),
              rattrapage: toNum(line.rattrapage),
              rachat: toNum(line.rachat),
            },
          };
        })
      );
    } catch (e) {
      setError((e as Error).message || "Échec import en lots.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <header>
        <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Fiche de cotation — PageDetail</h1>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
          <p className="text-xs text-gray-500">Nombre de parcours</p>
          <p className="text-sm font-semibold text-midnight_text dark:text-white">{parcoursCount}</p>
          <p className="mt-2 text-xs text-gray-500">Nombre de cotes disponibles</p>
          <p className="text-sm font-semibold text-midnight_text dark:text-white">
            {cotesDisponiblesCount} / {totalCotesPossible}
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
          <p className="text-xs text-gray-500">Cours</p>
          <p className="text-sm font-semibold text-midnight_text dark:text-white">{courseDesignation}</p>
          <p className="mt-2 text-xs text-gray-500">Crédit cours</p>
          <p className="text-sm font-semibold text-midnight_text dark:text-white">{courseCredit}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
          <p className="text-xs text-gray-500">Meilleure note</p>
          <p className="text-sm font-semibold text-midnight_text dark:text-white">{bestStudent?.name ?? "—"}</p>
          <p className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-400">
            {bestStudent ? bestStudent.total.toFixed(2) : "—"}
          </p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900/60">
          <p className="text-xs text-gray-500">Plus faible note</p>
          <p className="text-sm font-semibold text-midnight_text dark:text-white">{worstStudent?.name ?? "—"}</p>
          <p className="mt-2 text-lg font-bold text-rose-700 dark:text-rose-400">
            {worstStudent ? worstStudent.total.toFixed(2) : "—"}
          </p>
        </article>
      </div>

      <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher étudiant..."
          className="min-w-[280px] flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="button"
          onClick={exportCsv}
          className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          Exporter CSV
        </button>
        <button
          type="button"
          onClick={() => {
            setShowImportModal(true);
            setImportStep(1);
            setImportInfo(null);
          }}
          className="whitespace-nowrap rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
        >
          Importer CSV
        </button>
        <button
          type="button"
          onClick={() => void saveAll()}
          disabled={saving}
          className="whitespace-nowrap rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
        >
          {saving ? "Enregistrement..." : `Enregistrer (${Object.values(staged).reduce((acc, d) => acc + Object.keys(d).length, 0)})`}
        </button>
      </div>
      {loading ? <p className="text-sm text-gray-500">Chargement...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {message ? <p className="text-sm text-emerald-600">{message}</p> : null}
      {noStudentAvailable ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100">
          <p className="text-sm font-medium">
            Aucun étudiant n&apos;est disponible dans le repository pour ce cours.
          </p>
          <button
            type="button"
            onClick={() => router.push("/titulaire/notes")}
            className="mt-3 rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
          >
            Retourner en arrière
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {filtered.map((row) => (
          <article key={row.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-start gap-3">
                {row.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={row.photo}
                    alt={row.nomComplet}
                    className="h-12 w-12 rounded-full border border-gray-200 object-cover dark:border-gray-700"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-sm font-semibold text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {row.nomComplet
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((x) => x[0]?.toUpperCase() ?? "")
                      .join("") || "ET"}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">{row.nomComplet || "—"}</p>
                  <p className="truncate text-xs text-gray-500">{row.matricule}</p>
                  <p className="truncate text-xs text-gray-500">{row.email}</p>
                </div>
              </div>
              <span className={`rounded-full px-2 py-1 text-[11px] font-semibold ${row.hasExistingNote ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                {row.hasExistingNote || Boolean(staged[row.id] && Object.keys(staged[row.id]).length)
                  ? `Total: ${computeTotal({
                      cc: staged[row.id]?.cc ?? row.values.cc,
                      examen: staged[row.id]?.examen ?? row.values.examen,
                      rattrapage: staged[row.id]?.rattrapage ?? row.values.rattrapage,
                      rachat: staged[row.id]?.rachat ?? row.values.rachat,
                    }).toFixed(2)}`
                  : "Total: —"}
              </span>
            </div>
            <div className="mt-3 space-y-1 text-xs text-gray-500">
              <p>
                Sexe: <strong>{row.sexe || "—"}</strong> · Nationalité: <strong>{row.nationalite || "—"}</strong>
              </p>
              <p>
                Naissance: <strong>{formatDateFr(row.dateNaissance)}</strong> · Lieu: <strong>{row.lieuNaissance || "—"}</strong>
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["cc", "examen", "rattrapage", "rachat"] as NoteType[]).map((key) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-[11px] font-semibold uppercase text-gray-500">{key}</span>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step="0.01"
                    value={inputs[row.id]?.[key] ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value;
                      setInputs((prev) => ({
                        ...prev,
                        [row.id]: { ...(prev[row.id] ?? {}), [key]: raw },
                      }));
                      const num = Number(raw.replace(",", "."));
                      if (Number.isFinite(num) && num >= 0 && num <= 20) {
                        setStaged((prev) => ({
                          ...prev,
                          [row.id]: { ...(prev[row.id] ?? {}), [key]: num },
                        }));
                      }
                    }}
                    placeholder={key.toUpperCase()}
                    className="w-full rounded-md border border-gray-300 px-2 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  />
                </label>
              ))}
            </div>
          </article>
        ))}
      </div>
      {showImportModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-xl dark:border-gray-800 dark:bg-gray-900">
            <h3 className="text-lg font-semibold text-midnight_text dark:text-white">Import notes — 3 étapes</h3>
            <p className="mt-1 text-xs text-gray-500">Étape {importStep}/3</p>
            {importStep === 1 ? (
              <div className="mt-3 space-y-3">
                <button
                  type="button"
                  onClick={downloadImportTemplate}
                  className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
                >
                  Télécharger modèle [Email, Nom, CC, EXAMEN, RATTRAPAGE, RACHAT]
                </button>
                <label className="block rounded-md border border-dashed border-gray-300 p-3 text-sm dark:border-gray-700">
                  <span className="mb-2 block text-xs text-gray-500">Charger le fichier CSV de cotation</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => void onPickCsvFile(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#082b1c] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white dark:file:bg-[#5ec998] dark:file:text-gray-900"
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    {csvFileName ? `Fichier sélectionné: ${csvFileName}` : "Aucun fichier sélectionné"}
                  </p>
                </label>
              </div>
            ) : null}
            {importStep === 2 ? (
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {([
                  ["email", "Email"],
                  ["nom", "Nom"],
                  ["cc", "CC"],
                  ["examen", "EXAMEN"],
                  ["rattrapage", "RATTRAPAGE"],
                  ["rachat", "RACHAT"],
                ] as const).map(([key, label]) => (
                  <label key={key} className="block text-sm">
                    <span className="mb-1 block text-xs text-gray-500">{label}</span>
                    <select
                      value={mapping[key] ?? ""}
                      onChange={(e) => setMapping((prev) => ({ ...prev, [key]: e.target.value || undefined }))}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    >
                      <option value="">Non mappé</option>
                      {importHeaders.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
            ) : null}
            {importStep === 3 ? (
              <div className="mt-3 rounded-md border border-gray-200 p-3 text-sm dark:border-gray-700">
                <p>Lignes chargées: <strong>{importRows.length}</strong></p>
                <p>Mapping email: <strong>{mapping.email || "Non mappé"}</strong></p>
                <p className="text-xs text-gray-500">Les colonnes de notes non mappées seront ignorées.</p>
              </div>
            ) : null}
            {importInfo ? <p className="mt-2 text-xs text-gray-500">{importInfo}</p> : null}
            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  if (importStep > 1) {
                    setImportStep((prev) => (prev === 1 ? 1 : ((prev - 1) as 1 | 2 | 3)));
                    return;
                  }
                  setShowImportModal(false);
                }}
                className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700"
              >
                {importStep > 1 ? "Retour" : "Annuler"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (importStep === 1) {
                    startImportStep2();
                    return;
                  }
                  if (importStep === 2) {
                    setImportStep(3);
                    return;
                  }
                  void runImportStep3();
                }}
                disabled={importing || (importStep >= 2 && !mapping.email)}
                className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
              >
                {importStep < 3 ? "Suivant" : importing ? "Import..." : "Importer par lots (10)"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

