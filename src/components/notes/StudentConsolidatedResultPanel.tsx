"use client";

import { useMemo, useState, type ComponentType } from "react";
import { Icon } from "@iconify/react";
import type {
  ConsolidatedResultDocumentPayload,
  ConsolidatedStudentProfile,
  ProgrammeMatiereContext,
  StructuredNotesEntry,
} from "@/lib/notes/consolidatedResultTypes";

export type {
  ConsolidatedResultDocumentPayload,
  ProgrammeMatiereContext,
  ConsolidatedStudentProfile,
  StructuredNotesEntry,
};

type NotesElement = {
  _id: string;
  designation: string;
  credit: number;
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
};
type NotesUnite = { _id: string; code: string; designation: string; credit: number; elements: NotesElement[] };
type NotesSemestre = { _id: string; designation: string; credit: number; unites: NotesUnite[] };
type NotesStudentPayload = { studentId: string; studentName: string; matricule: string; semestres: NotesSemestre[] };

export type StudentConsolidatedResultPanelProps = {
  title?: string;
  /** Bouton « Fermer » (ex. vue organisateur inline). */
  onClose?: () => void;
  /** Libellé du bouton de fermeture (défaut : « Fermer »). */
  closeLabel?: string;
  student: ConsolidatedStudentProfile | null;
  notes: StructuredNotesEntry | undefined;
  notesLoading: boolean;
  programmeCredits: number;
  programmeName: string;
  mappingRows: ProgrammeMatiereContext[];
  /** Affiché dans la carte Parcours (ex. slug année). */
  anneeLabel: string;
  onPrint?: () => void;
  /** Composant bouton d’impression (affiché seulement si fourni). */
  BtnPrint?: ComponentType<{ onClick?: () => void; label?: string }>;
  /** Libellé du bouton d’impression (défaut : « Imprimer »). */
  btnPrintLabel?: string;
  /** Affiche le bouton « Générer le document » uniquement si défini. Reçoit le snapshot affiché. */
  onGenerateDocument?: (payload: ConsolidatedResultDocumentPayload) => void | Promise<void>;
  /** Libellé du bouton document (défaut : « Générer le document »). */
  generateDocumentLabel?: string;
  /** Désactive le bouton document (ex. génération en cours). */
  generateDocumentDisabled?: boolean;
};

function decodeText(input: string): string {
  return input
    .replaceAll("Ã©", "é")
    .replaceAll("Ã¨", "è")
    .replaceAll("Ãª", "ê")
    .replaceAll("Ã ", "à")
    .replaceAll("Ã§", "ç");
}
function normalizeText(input: string): string {
  return decodeText(String(input ?? ""))
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}
function noteMatiere(el: NotesElement): number {
  if (el.rachat > 0) return el.rachat;
  return el.cc + el.examen > el.rattrapage ? el.cc + el.examen : el.rattrapage;
}
function moyUnite(u: NotesUnite): number {
  if (u.credit <= 0) return 0;
  const sum = u.elements.reduce((acc, e) => acc + noteMatiere(e) * e.credit, 0);
  return sum / u.credit;
}
function resolveMentionFromPercentage(percent: number): "A" | "B" | "C" | "D" | "E" {
  if (percent >= 90) return "A";
  if (percent >= 80) return "B";
  if (percent >= 70) return "C";
  if (percent >= 60) return "D";
  return "E";
}
function parseNotesPayload(raw: unknown): NotesStudentPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const src = raw as Record<string, unknown>;
  const semestres = Array.isArray(src.semestres) ? (src.semestres as Array<Record<string, unknown>>) : [];
  return {
    studentId: String(src.studentId ?? ""),
    studentName: String(src.studentName ?? ""),
    matricule: String(src.matricule ?? ""),
    semestres: semestres.map((s) => ({
      _id: String(s._id ?? ""),
      designation: decodeText(String(s.designation ?? "")),
      credit: Number(s.credit ?? 0),
      unites: (Array.isArray(s.unites) ? (s.unites as Array<Record<string, unknown>>) : []).map((u) => ({
        _id: String(u._id ?? ""),
        code: String(u.code ?? ""),
        designation: decodeText(String(u.designation ?? "")),
        credit: Number(u.credit ?? 0),
        elements: (Array.isArray(u.elements) ? (u.elements as Array<Record<string, unknown>>) : []).map((e) => ({
          _id: String(e._id ?? ""),
          designation: decodeText(String(e.designation ?? "")),
          credit: Number(e.credit ?? 0),
          cc: Number(e.cc ?? 0),
          examen: Number(e.examen ?? 0),
          rattrapage: Number(e.rattrapage ?? 0),
          rachat: Number(e.rachat ?? 0),
        })),
      })),
    })),
  };
}

export default function StudentConsolidatedResultPanel({
  title = "Résultat consolidé",
  onClose,
  closeLabel = "Fermer",
  student,
  notes,
  notesLoading,
  programmeCredits,
  programmeName,
  mappingRows,
  anneeLabel,
  onPrint,
  BtnPrint,
  btnPrintLabel = "Imprimer",
  onGenerateDocument,
  generateDocumentLabel = "Générer le document",
  generateDocumentDisabled,
}: StudentConsolidatedResultPanelProps) {
  console.log("notes parsed : ", notes);
  console.log("mappingRows : ", mappingRows);
  console.log("anneeLabel : ", anneeLabel);
  const [activeSemestreId, setActiveSemestreId] = useState<string>("");
  const [expandedUnites, setExpandedUnites] = useState<Record<string, boolean>>({});

  const displayName = useMemo(() => {
    const fromStudent = student?.nomComplet?.trim();
    if (fromStudent) return fromStudent;
    const remote = parseNotesPayload(notes?.data);
    return remote?.studentName?.trim() || "—";
  }, [student?.nomComplet, notes?.data]);

  const reconciled = useMemo(() => {
    const remote = parseNotesPayload(notes?.data);
    const remoteByMatiereId = new Map<string, NotesElement>();
    const remoteByDesignation = new Map<string, NotesElement>();
    for (const s of remote?.semestres ?? []) {
      for (const u of s.unites ?? []) {
        for (const e of u.elements ?? []) {
          remoteByMatiereId.set(String(e._id), e);
          remoteByDesignation.set(normalizeText(e.designation), e);
        }
      }
    }
    const semMap = new Map<string, NotesSemestre>();
    for (const row of mappingRows) {
      const semRef = String(row.semestre.reference ?? "");
      const ueRef = String(row.unite.reference ?? "");
      if (!semRef || !ueRef) continue;
      if (!semMap.has(semRef)) {
        semMap.set(semRef, {
          _id: semRef,
          designation: decodeText(row.semestre.designation),
          credit: Number(row.semestre.credits ?? 0),
          unites: [],
        });
      }
      const sem = semMap.get(semRef)!;
      let ue = sem.unites.find((x) => x._id === ueRef);
      if (!ue) {
        ue = {
          _id: ueRef,
          code: row.unite.code ?? "",
          designation: decodeText(row.unite.designation),
          credit: Number(row.unite.credits ?? 0),
          elements: [],
        };
        sem.unites.push(ue);
      }
      const remoteMatch =
        remoteByMatiereId.get(String(row.matiere.reference)) ??
        remoteByDesignation.get(normalizeText(row.matiere.designation));
      ue.elements.push({
        _id: String(row.matiere.reference),
        designation: decodeText(row.matiere.designation),
        credit: Number(row.matiere.credits ?? 0),
        cc: Number(remoteMatch?.cc ?? 0),
        examen: Number(remoteMatch?.examen ?? 0),
        rattrapage: Number(remoteMatch?.rattrapage ?? 0),
        rachat: Number(remoteMatch?.rachat ?? 0),
      });
    }
    const semestres = [...semMap.values()].sort((a, b) => a.designation.localeCompare(b.designation, "fr"));
    return semestres;
  }, [notes?.data, mappingRows]);

  const tabsSem = reconciled;
  const currentSemId = activeSemestreId || tabsSem[0]?._id || "";
  const currentSem = tabsSem.find((s) => s._id === currentSemId) ?? tabsSem[0] ?? null;
  const allUnites = reconciled.flatMap((s) => s.unites);
  const ncvComputed = allUnites.reduce((acc, u) => (moyUnite(u) >= 10 ? acc + u.credit : acc), 0);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const ncv = round2(Math.min(ncvComputed, programmeCredits || 0));
  const ncnv = round2(Math.max(0, (programmeCredits || 0) - ncv));
  const percent = programmeCredits > 0 ? (ncv / programmeCredits) * 100 : 0;
  const mention = resolveMentionFromPercentage(percent);
  const decision = ncv >= 45 ? "Passé" : "Double";

  const documentPayload: ConsolidatedResultDocumentPayload = useMemo(
    () => ({
      title,
      nomAffiche: displayName,
      student,
      programmeName,
      programmeCredits,
      anneeLabel,
      mappingRows,
      notes,
      synthese: {
        ncv,
        ncnv,
        pourcentage: percent,
        mention,
        decisionJury: decision,
        nombreSemestres: reconciled.length,
      },
      semestres: reconciled.map((s) => ({
        semestreId: s._id,
        designation: s.designation,
        credit: s.credit,
        unites: s.unites.map((u) => ({
          uniteId: u._id,
          code: u.code,
          designation: u.designation,
          credit: u.credit,
          moyenne: moyUnite(u),
          matieres: u.elements.map((e) => ({
            matiereId: e._id,
            designation: e.designation,
            credit: e.credit,
            cc: e.cc,
            examen: e.examen,
            rattrapage: e.rattrapage,
            rachat: e.rachat,
            noteFinale: noteMatiere(e),
          })),
        })),
      })),
    }),
    [
      title,
      displayName,
      student,
      programmeName,
      programmeCredits,
      anneeLabel,
      mappingRows,
      notes,
      ncv,
      ncnv,
      percent,
      mention,
      decision,
      reconciled,
    ]
  );

  return (
    <div
      className="rounded-2xl border border-primary/20 bg-gradient-to-br from-white via-white to-primary/[0.06] p-4 shadow-sm dark:border-primary/25 dark:from-darklight dark:via-darklight dark:to-primary/10 sm:p-6"
      data-testid="student-consolidated-result-panel"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-primary/15 pb-4 dark:border-primary/20">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-midnight_text dark:text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Synthèse programme et notes — relevé consolidé
          </p>
        </div>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-midnight_text transition hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900/60 dark:text-white dark:hover:bg-slate-800"
          >
            {closeLabel}
          </button>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-10">
        <aside className="space-y-3 lg:col-span-3">
          <article className="rounded-xl border border-slate-200/90 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Étudiant</h4>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Nom:</strong> {displayName}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Matricule:</strong> {student?.matricule ?? "—"}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Email:</strong> {student?.email ?? "—"}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Sexe:</strong> {student?.sexe || "—"}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Nationalité:</strong> {student?.nationalite || "—"}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200/90 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Parcours</h4>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Année:</strong> {student?.anneeSlug || anneeLabel || "—"}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Programme:</strong> {programmeName || "—"}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">NCV:</strong> {ncv.toFixed(2)}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">NCNV:</strong> {ncnv.toFixed(2)}
            </p>
          </article>
          <article className="rounded-xl border border-slate-200/90 bg-white/90 p-4 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-primary">Résultat</h4>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Pourcentage:</strong> {percent.toFixed(2)}%
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Mention:</strong> {mention}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Décision jury:</strong> {decision}
            </p>
            <p className="text-slate-700 dark:text-slate-300">
              <strong className="text-midnight_text dark:text-white">Semestres:</strong> {reconciled.length}
            </p>
          </article>
          {BtnPrint || onGenerateDocument ? (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              {BtnPrint ? <BtnPrint onClick={onPrint} label={btnPrintLabel} /> : null}
              {onGenerateDocument ? (
                <button
                  type="button"
                  onClick={() => void onGenerateDocument(documentPayload)}
                  disabled={generateDocumentDisabled}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-darkprimary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon icon="solar:document-add-bold-duotone" className="text-lg" aria-hidden />
                  {generateDocumentLabel}
                </button>
              ) : null}
            </div>
          ) : null}
        </aside>

        <main className="space-y-3 lg:col-span-7">
          {notesLoading ? (
            <p className="text-sm font-medium text-primary">Chargement des notes…</p>
          ) : null}
          {!notesLoading && notes && !notes.ok ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
              Notes indisponibles ({notes.status}){notes.message ? ` — ${notes.message}` : ""}
            </p>
          ) : null}
          {!notesLoading && notes?.ok && currentSem ? (
            <>
              <div className="flex flex-wrap gap-2">
                {tabsSem.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    onClick={() => setActiveSemestreId(s._id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      s._id === currentSemId
                        ? "bg-primary text-white shadow-sm"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                    }`}
                  >
                    {s.designation}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {currentSem.unites.map((u) => {
                  const isOpen = Boolean(expandedUnites[u._id]);
                  const moy = moyUnite(u);
                  return (
                    <article
                      key={u._id}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedUnites((prev) => ({
                            ...prev,
                            [u._id]: !prev[u._id],
                          }))
                        }
                        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left transition hover:bg-primary/[0.04] dark:hover:bg-white/[0.04]"
                      >
                        <div>
                          <p className="text-sm font-semibold text-midnight_text dark:text-white">
                            {u.code} - {u.designation}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Crédits: {u.credit} · Moyenne: {moy.toFixed(2)}
                          </p>
                        </div>
                        <Icon
                          icon={isOpen ? "ion:chevron-up-outline" : "ion:chevron-down-outline"}
                          className="text-lg text-primary"
                          aria-hidden
                        />
                      </button>
                      {isOpen ? (
                        <div className="border-t border-slate-200 px-3 py-2 dark:border-slate-700">
                          <table className="min-w-full text-xs">
                            <thead>
                              <tr className="text-left text-slate-500 dark:text-slate-400">
                                <th className="py-1.5 pr-2">Matière</th>
                                <th className="py-1.5 pr-2">Cr</th>
                                <th className="py-1.5 pr-2">CC</th>
                                <th className="py-1.5 pr-2">Ex</th>
                                <th className="py-1.5 pr-2">Rat</th>
                                <th className="py-1.5 pr-2">Rach</th>
                                <th className="py-1.5">Note</th>
                              </tr>
                            </thead>
                            <tbody>
                              {u.elements.map((e) => (
                                <tr key={e._id} className="border-t border-slate-100 dark:border-slate-800">
                                  <td className="py-1.5 text-slate-800 dark:text-slate-200">{e.designation}</td>
                                  <td className="py-1.5">{e.credit}</td>
                                  <td className="py-1.5">{e.cc}</td>
                                  <td className="py-1.5">{e.examen}</td>
                                  <td className="py-1.5">{e.rattrapage}</td>
                                  <td className="py-1.5">{e.rachat}</td>
                                  <td className="py-1.5 font-semibold text-primary">{noteMatiere(e).toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </>
          ) : null}
        </main>
      </div>
    </div>
  );
}
