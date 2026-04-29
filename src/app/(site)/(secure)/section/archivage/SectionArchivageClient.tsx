"use client";

import { useEffect, useMemo, useState } from "react";
import PageManager from "@/components/secure/PageManager";
import {
  listParcoursForArchivage,
  sendRattrapageNotesBatch,
  type NotePayloadLine,
} from "@/actions/organisateurArchivage";

export type ProgrammeMatiereContext = {
  key: string;
  matiere: { designation: string; reference: string; credits: number };
  unite: { designation: string; reference: string; code: string; credits: number };
  semestre: { designation: string; reference: string; credits: number };
};
type ProgrammeLite = { id: string; designation: string; slug: string; credits: number; matieres: ProgrammeMatiereContext[] };
type SectionLite = { id: string; designation: string; slug: string; cycle: string };
type AnneeLite = { id: string; designation: string; slug: string; debut: number; fin: number; status: boolean };

export type ArchivageBootstrap = {
  authorized: boolean;
  message?: string;
  sections: SectionLite[];
  annees: AnneeLite[];
  programmesBySection: Record<string, ProgrammeLite[]>;
};

type ProgrammeCardItem = ProgrammeLite & { id: string };
type ParcoursRow = { id: string; matricule: string; email: string; nomComplet: string; studentId: string };
type CsvRow = Record<string, string>;
type MatchRow = CsvRow & { __matched: boolean; __parcoursId?: string };

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

function parseCsv(text: string): { headers: string[]; rows: CsvRow[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return { headers: [], rows: [] };
  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = splitCsvLine(lines[0], delimiter);
  const rows = lines.slice(1).map((line) => {
    const cols = splitCsvLine(line, delimiter);
    const row: CsvRow = {};
    headers.forEach((h, i) => {
      row[h] = String(cols[i] ?? "").trim();
    });
    return row;
  });
  return { headers, rows };
}

function exportTemplate(parcours: ParcoursRow[], matieres: ProgrammeMatiereContext[]) {
  const headers = ["matricule", "email", ...matieres.map((m) => m.matiere.designation)];
  const lines = [headers.join(",")];
  for (const row of parcours) {
    const emptyNotes = matieres.map(() => "");
    lines.push([row.matricule, row.email, ...emptyNotes].map((x) => `"${String(x).replaceAll('"', '""')}"`).join(","));
  }
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "template-archivage-notes.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function SectionArchivageClient({ bootstrap }: { bootstrap: ArchivageBootstrap }) {
  const [activeSectionId, setActiveSectionId] = useState(bootstrap.sections[0]?.id ?? "");
  const [activeAnneeSlug, setActiveAnneeSlug] = useState(
    bootstrap.annees.find((x) => x.status)?.slug ?? bootstrap.annees[0]?.slug ?? ""
  );
  const [searchProgramme, setSearchProgramme] = useState("");
  const [selectedProgrammeId, setSelectedProgrammeId] = useState("");
  const [parcoursRows, setParcoursRows] = useState<ParcoursRow[]>([]);
  const [parcoursSearch, setParcoursSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvMatches, setCsvMatches] = useState<MatchRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [notesMappingRows, setNotesMappingRows] = useState<ProgrammeMatiereContext[]>([]);
  const [notesMappingLoading, setNotesMappingLoading] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [sending, setSending] = useState(false);
  const [sendInfo, setSendInfo] = useState<string>("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);

  const sections = bootstrap.sections;
  const programmes = useMemo(
    () => bootstrap.programmesBySection[activeSectionId] ?? [],
    [bootstrap.programmesBySection, activeSectionId]
  );

  useEffect(() => {
    if (!selectedProgrammeId && programmes[0]?.id) {
      setSelectedProgrammeId(programmes[0].id);
      return;
    }
    if (selectedProgrammeId && !programmes.some((p) => p.id === selectedProgrammeId)) {
      setSelectedProgrammeId(programmes[0]?.id ?? "");
    }
  }, [programmes, selectedProgrammeId]);

  const filteredProgrammes = useMemo(() => {
    const q = searchProgramme.trim().toLowerCase();
    if (!q) return programmes;
    return programmes.filter((p) => p.designation.toLowerCase().includes(q) || p.slug.toLowerCase().includes(q));
  }, [programmes, searchProgramme]);

  const selectedProgramme = useMemo(
    () => programmes.find((p) => p.id === selectedProgrammeId) ?? null,
    [programmes, selectedProgrammeId]
  );
  const selectedMappingRows = useMemo(
    () => (notesMappingRows.length > 0 ? notesMappingRows : selectedProgramme?.matieres ?? []),
    [notesMappingRows, selectedProgramme]
  );
  const activeSection = useMemo(() => sections.find((s) => s.id === activeSectionId) ?? null, [sections, activeSectionId]);

  const tabs = useMemo(
    () =>
      bootstrap.annees.map((a) => ({
        value: a.slug,
        label: a.designation || `${a.debut}-${a.fin}`,
      })),
    [bootstrap.annees]
  );

  useEffect(() => {
    async function run() {
      if (!activeSection || !selectedProgramme || !activeAnneeSlug) return;
      setLoading(true);
      setError(null);
      try {
        const res = await listParcoursForArchivage({
          anneeSlug: activeAnneeSlug,
          sectionSlug: activeSection.slug,
          programmeSlug: selectedProgramme.slug,
          search: parcoursSearch.trim() || undefined,
          page: 1,
          limit: 100,
        });
        const rows = (res.data ?? []).map((raw) => {
          const x = raw as Record<string, unknown>;
          const st = (x.student ?? {}) as Record<string, unknown>;
          return {
            id: String(x._id ?? x.id ?? ""),
            matricule: String(st.matricule ?? ""),
            email: String(st.mail ?? st.email ?? ""),
            nomComplet: String(st.name ?? st.nomComplet ?? "—"),
            studentId: String(x.reference ?? ""),
          };
        });
        setParcoursRows(rows);
      } catch (e) {
        setParcoursRows([]);
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }
    void run();
  }, [activeSection, selectedProgramme, activeAnneeSlug, parcoursSearch]);

  useEffect(() => {
    async function loadNotesMapping() {
      if (!activeSectionId || !selectedProgrammeId) {
        setNotesMappingRows([]);
        return;
      }
      setNotesMappingLoading(true);
      try {
        const res = await fetch(
          `/api/sections/${encodeURIComponent(activeSectionId)}/programmes/${encodeURIComponent(selectedProgrammeId)}/notes-mapping`
        );
        const json = (await res.json().catch(() => ({}))) as {
          data?: { rows?: ProgrammeMatiereContext[] };
          message?: string;
        };
        if (!res.ok) {
          setNotesMappingRows([]);
          setError(json.message ?? "Impossible de charger le mapping des matières.");
          return;
        }
        setNotesMappingRows(Array.isArray(json.data?.rows) ? json.data.rows : []);
      } catch {
        setNotesMappingRows([]);
      } finally {
        setNotesMappingLoading(false);
      }
    }
    void loadNotesMapping();
  }, [activeSectionId, selectedProgrammeId]);

  const matchedCount = useMemo(() => csvMatches.filter((r) => r.__matched).length, [csvMatches]);
  const unmatchedCount = Math.max(0, csvMatches.length - matchedCount);

  function openWizard() {
    setWizardOpen(true);
    setWizardStep(1);
    setCsvHeaders([]);
    setCsvMatches([]);
    setMapping({});
    setSendInfo("");
    setSendError(null);
    setSendSuccess(null);
  }

  async function onCsvFileChange(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const parsed = parseCsv(text);
    setCsvHeaders(parsed.headers);
    const idxByMatricule = new Map(parcoursRows.map((p) => [p.matricule.trim().toLowerCase(), p]));
    const idxByEmail = new Map(parcoursRows.map((p) => [p.email.trim().toLowerCase(), p]));

    const hMat = parsed.headers.find((h) => ["matricule"].includes(normalizeHeader(h)));
    const hEmail = parsed.headers.find((h) => ["email", "mail"].includes(normalizeHeader(h)));

    const report: MatchRow[] = parsed.rows.map((row) => {
      const matricule = String(hMat ? row[hMat] ?? "" : "").trim().toLowerCase();
      const email = String(hEmail ? row[hEmail] ?? "" : "").trim().toLowerCase();
      const found = idxByMatricule.get(matricule) ?? idxByEmail.get(email);
      return {
        ...row,
        __matched: Boolean(found),
        __parcoursId: found?.id,
      };
    });
    setCsvMatches(report);
  }

  function parseNoteValue(raw: string): number | null {
    const v = String(raw ?? "").trim();
    if (!v) return null;
    if (v.toUpperCase() === "X") return null;
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n)) return null;
    if (n < 0 || n > 20) return null;
    return n;
  }

  function buildPayloadLines(): NotePayloadLine[] {
    if (!selectedProgramme) return [];
    const parcoursById = new Map(parcoursRows.map((p) => [p.id, p]));
    const lines: NotePayloadLine[] = [];
    for (const row of csvMatches) {
      if (!row.__matched || !row.__parcoursId) continue;
      const p = parcoursById.get(row.__parcoursId);
      if (!p || !p.matricule || !p.email || !p.studentId || !p.nomComplet) continue;
      for (const m of selectedMappingRows) {
        const csvCol = mapping[m.matiere.reference];
        if (!csvCol) continue;
        const note = parseNoteValue(String(row[csvCol] ?? ""));
        if (note == null) continue; // vide / X / invalide => on ignore
        lines.push({
          email: p.email,
          matricule: p.matricule,
          studentId: p.studentId,
          studentName: p.nomComplet,
          semestre: {
            designation: m.semestre.designation,
            reference: m.semestre.reference,
            credit: m.semestre.credits,
          },
          unite: {
            designation: m.unite.designation,
            reference: m.unite.reference,
            code: m.unite.code,
            credit: m.unite.credits,
          },
          matiere: {
            designation: m.matiere.designation,
            reference: m.matiere.reference,
            credit: m.matiere.credits,
          },
          cc: 0,
          examen: 0,
          rattrapage: note,
          rachat: 0,
        });
      }
    }
    return lines;
  }

  async function sendInTenBatches() {
    const lines = buildPayloadLines();
    if (lines.length === 0) {
      setSendError("Aucune ligne valide à envoyer (mapping, X, valeurs vides ou invalides).");
      setSendSuccess(null);
      return;
    }
    setSending(true);
    setSendError(null);
    setSendSuccess(null);
    setSendInfo("Préparation des 10 lots...");
    const totalBatches = 10;
    const chunkSize = Math.max(1, Math.ceil(lines.length / totalBatches));
    let sent = 0;
    try {
      for (let i = 0; i < totalBatches; i += 1) {
        const start = i * chunkSize;
        const chunk = lines.slice(start, start + chunkSize);
        const batchIndex = i + 1;
        if (chunk.length === 0) {
          setSendInfo(`Lot ${batchIndex}/${totalBatches} ignoré (vide).`);
          continue;
        }
        setSendInfo(`Envoi lot ${batchIndex}/${totalBatches} (${chunk.length} lignes)...`);
        const res = await sendRattrapageNotesBatch({
          batchIndex,
          totalBatches,
          lines: chunk,
        });
        sent += res.count;
        setSendInfo(`Lot ${batchIndex}/${totalBatches} envoyé (${res.count} lignes).`);
      }
      setSendSuccess(`Envoi terminé: ${sent} lignes envoyées sur ${lines.length} préparées.`);
      setWizardStep(3);
    } catch (e) {
      setSendError((e as Error).message || "Échec d'envoi des lots.");
    } finally {
      setSending(false);
    }
  }

  if (!bootstrap.authorized) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-amber-950 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100">
        <h1 className="text-lg font-semibold">Archivage des notes</h1>
        <p className="mt-2 text-sm">{bootstrap.message ?? "Accès non autorisé."}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageManager<ProgrammeCardItem>
        title="Archivage des notes"
        description="Choisissez l'année académique et le programme pour préparer l'import des cotes en bulk."
        items={filteredProgrammes}
        tabs={tabs}
        activeTab={activeAnneeSlug}
        onTabChange={(v) => setActiveAnneeSlug(v)}
        searchText={searchProgramme}
        onSearchChange={setSearchProgramme}
        searchPlaceholder="Rechercher un programme..."
        CardItem={({ item }) => (
          <button
            type="button"
            onClick={() => setSelectedProgrammeId(item.id)}
            className={`w-full rounded-xl border px-4 py-3 text-left ${
              selectedProgrammeId === item.id
                ? "border-[#082b1c] bg-[#082b1c]/5 dark:border-[#5ec998]"
                : "border-gray-200 dark:border-gray-700"
            }`}
          >
            <p className="text-sm font-semibold text-midnight_text dark:text-white">{item.designation}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {item.credits} crédits · {item.matieres.length} matière(s)
            </p>
          </button>
        )}
        showCreateButton={false}
        CardCreate={() => null}
      />

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-midnight_text dark:text-white">PageDetail · Parcours du programme</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Section: <strong>{activeSection?.designation ?? "—"}</strong> · Programme:{" "}
              <strong>{selectedProgramme?.designation ?? "—"}</strong>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => exportTemplate(parcoursRows, selectedMappingRows)}
              disabled={!selectedProgramme || parcoursRows.length === 0}
              className="rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-600"
            >
              Exporter template CSV
            </button>
            <button
              type="button"
              onClick={openWizard}
              disabled={!selectedProgramme || parcoursRows.length === 0}
              className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
            >
              Importer cotes (2 étapes)
            </button>
          </div>
        </div>

        <div className="mt-4">
          <input
            type="search"
            value={parcoursSearch}
            onChange={(e) => setParcoursSearch(e.target.value)}
            placeholder="Rechercher un parcours (matricule, mail, nom)..."
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>

        <div className="mt-4 overflow-x-auto">
          {loading ? (
            <p className="text-sm text-gray-500">Chargement des parcours...</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : parcoursRows.length === 0 ? (
            <p className="text-sm text-gray-500">Aucun parcours trouvé pour ce programme/année.</p>
          ) : (
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="px-2 py-2 text-left">Matricule</th>
                  <th className="px-2 py-2 text-left">Email</th>
                  <th className="px-2 py-2 text-left">Nom complet</th>
                </tr>
              </thead>
              <tbody>
                {parcoursRows.map((row) => (
                  <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                    <td className="px-2 py-2">{row.matricule || "—"}</td>
                    <td className="px-2 py-2">{row.email || "—"}</td>
                    <td className="px-2 py-2">{row.nomComplet || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {wizardOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white p-6 dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white">
                Import cotes en bulk - Etape {wizardStep}/3
              </h3>
              <button type="button" className="text-sm underline" onClick={() => setWizardOpen(false)}>
                Fermer
              </button>
            </div>

            {wizardStep === 1 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  1) Chargez le CSV puis on mappe les lignes avec les parcours via <strong>matricule</strong> et/ou{" "}
                  <strong>email</strong>.
                </p>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void onCsvFileChange(e.target.files?.[0] ?? null)}
                  className="block w-full text-sm"
                />
                {csvMatches.length > 0 ? (
                  <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                    <p>
                      Lignes: <strong>{csvMatches.length}</strong> | Matchées: <strong>{matchedCount}</strong> | Non matchées:{" "}
                      <strong>{unmatchedCount}</strong>
                    </p>
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <button
                    type="button"
                    disabled={matchedCount === 0}
                    onClick={() => setWizardStep(2)}
                    className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
                  >
                    Passer au mapping des matières
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  2) Mappez chaque matière de la base avec la colonne du CSV correspondante.
                </p>
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="px-2 py-2 text-left">Matière BDD</th>
                        <th className="px-2 py-2 text-left">Colonne CSV</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedMappingRows.map((m) => (
                        <tr key={m.key} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="px-2 py-2">{m.matiere.designation}</td>
                          <td className="px-2 py-2">
                            <select
                              value={mapping[m.matiere.reference] ?? ""}
                              onChange={(e) =>
                                setMapping((prev) => ({
                                  ...prev,
                                  [m.matiere.reference]: e.target.value,
                                }))
                              }
                              className="rounded-md border border-gray-300 px-2 py-1 dark:border-gray-700 dark:bg-gray-800"
                            >
                              <option value="">-- Choisir une colonne --</option>
                              {csvHeaders.map((h) => (
                                <option key={h} value={h}>
                                  {h}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-between">
                  <button type="button" className="rounded-md border border-gray-300 px-3 py-2 text-sm" onClick={() => setWizardStep(1)}>
                    Retour étape 1
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white dark:bg-[#5ec998] dark:text-gray-900"
                    onClick={() => setWizardStep(3)}
                  >
                    Passer à l'envoi (étape 3)
                  </button>
                </div>
              </div>
            )}
            {wizardStep === 3 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  3) Envoi des cotes de rattrapage en <strong>10 lots</strong> avec feedback progressif.
                </p>
                <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800/50">
                  <p>Lignes préparées: <strong>{buildPayloadLines().length}</strong></p>
                  <p className="mt-1 text-xs text-gray-500">Règles: X ignoré, cc=0, examen=0, rachat=0.</p>
                  {notesMappingLoading ? <p className="mt-1 text-xs text-blue-600">Chargement mapping endpoint...</p> : null}
                </div>
                {sendInfo ? <p className="text-sm text-blue-700 dark:text-blue-300">{sendInfo}</p> : null}
                {sendError ? <p className="text-sm text-red-600">{sendError}</p> : null}
                {sendSuccess ? <p className="text-sm text-emerald-700 dark:text-emerald-300">{sendSuccess}</p> : null}
                <div className="flex justify-between">
                  <button
                    type="button"
                    className="rounded-md border border-gray-300 px-3 py-2 text-sm"
                    onClick={() => setWizardStep(2)}
                    disabled={sending}
                  >
                    Retour étape 2
                  </button>
                  <button
                    type="button"
                    className="rounded-md bg-[#082b1c] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
                    onClick={() => void sendInTenBatches()}
                    disabled={sending}
                  >
                    {sending ? "Envoi en cours..." : "Envoyer les 10 lots"}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

