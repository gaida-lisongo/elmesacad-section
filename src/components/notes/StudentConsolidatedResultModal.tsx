"use client";

import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { ParcoursActiveRow } from "@/lib/notes/useParcoursByActiveProgramme";

export type ProgrammeMatiereContext = {
  key: string;
  matiere: { designation: string; reference: string; credits: number };
  unite: { designation: string; reference: string; code: string; credits: number };
  semestre: { designation: string; reference: string; credits: number };
};

type NotesEntry = { ok: boolean; status: number; data: unknown | null; message?: string };
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

type Props = {
  open: boolean;
  onClose: () => void;
  student: ParcoursActiveRow | null;
  notes: NotesEntry | undefined;
  notesLoading: boolean;
  selectedProgrammeCredits: number;
  selectedProgrammeName: string;
  selectedMappingRows: ProgrammeMatiereContext[];
  activeAnneeSlug: string;
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

export default function StudentConsolidatedResultModal({
  open,
  onClose,
  student,
  notes,
  notesLoading,
  selectedProgrammeCredits,
  selectedProgrammeName,
  selectedMappingRows,
  activeAnneeSlug,
}: Props) {
  const [activeSemestreId, setActiveSemestreId] = useState<string>("");
  const [expandedUnites, setExpandedUnites] = useState<Record<string, boolean>>({});

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
    for (const row of selectedMappingRows) {
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
  }, [notes?.data, selectedMappingRows]);

  const tabsSem = reconciled;
  const currentSemId = activeSemestreId || tabsSem[0]?._id || "";
  const currentSem = tabsSem.find((s) => s._id === currentSemId) ?? tabsSem[0] ?? null;
  const allUnites = reconciled.flatMap((s) => s.unites);
  const ncvComputed = allUnites.reduce((acc, u) => (moyUnite(u) >= 10 ? acc + u.credit : acc), 0);
  const round2 = (v: number) => Math.round(v * 100) / 100;
  const ncv = round2(Math.min(ncvComputed, selectedProgrammeCredits || 0));
  const ncnv = round2(Math.max(0, (selectedProgrammeCredits || 0) - ncv));
  const percent = selectedProgrammeCredits > 0 ? (ncv / selectedProgrammeCredits) * 100 : 0;
  const mention = resolveMentionFromPercentage(percent);
  const decision = ncv >= 45 ? "Passé" : "Double";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[92vh] w-full max-w-6xl overflow-auto rounded-xl bg-white p-6 dark:bg-gray-900">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-midnight_text dark:text-white">Résultat consolidé étudiant</h3>
          <button type="button" className="text-sm underline" onClick={onClose}>
            Fermer
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-10">
          <aside className="space-y-3 lg:col-span-3">
            <article className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-2 font-semibold">Etudiant</h4>
              <p><strong>Nom:</strong> {student?.nomComplet ?? "—"}</p>
              <p><strong>Matricule:</strong> {student?.matricule ?? "—"}</p>
              <p><strong>Email:</strong> {student?.email ?? "—"}</p>
              <p><strong>Sexe:</strong> {student?.sexe || "—"}</p>
              <p><strong>Nationalité:</strong> {student?.nationalite || "—"}</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-2 font-semibold">Parcours</h4>
              <p><strong>Année:</strong> {student?.anneeSlug || activeAnneeSlug || "—"}</p>
              <p><strong>Programme:</strong> {selectedProgrammeName || "—"}</p>
              <p><strong>NCV:</strong> {ncv.toFixed(2)}</p>
              <p><strong>NCNV:</strong> {ncnv.toFixed(2)}</p>
            </article>
            <article className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-700 dark:bg-gray-800/50">
              <h4 className="mb-2 font-semibold">Résultat</h4>
              <p><strong>Pourcentage:</strong> {percent.toFixed(2)}%</p>
              <p><strong>Mention:</strong> {mention}</p>
              <p><strong>Décision jury:</strong> {decision}</p>
              <p><strong>Semestres:</strong> {reconciled.length}</p>
            </article>
          </aside>

          <main className="space-y-3 lg:col-span-7">
            {notesLoading ? <p className="text-sm text-blue-600">Chargement des notes...</p> : null}
            {!notesLoading && notes && !notes.ok ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Notes indisponibles ({notes.status}) {notes.message ? `- ${notes.message}` : ""}
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
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        s._id === currentSemId
                          ? "bg-[#082b1c] text-white dark:bg-[#5ec998] dark:text-gray-900"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
                      <article key={u._id} className="rounded-lg border border-gray-200 dark:border-gray-700">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedUnites((prev) => ({
                              ...prev,
                              [u._id]: !prev[u._id],
                            }))
                          }
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                        >
                          <div>
                            <p className="text-sm font-semibold">{u.code} - {u.designation}</p>
                            <p className="text-xs text-gray-500">Crédits: {u.credit} · Moyenne: {moy.toFixed(2)}</p>
                          </div>
                          <Icon icon={isOpen ? "ion:chevron-up-outline" : "ion:chevron-down-outline"} className="text-lg" />
                        </button>
                        {isOpen ? (
                          <div className="border-t border-gray-200 px-3 py-2 dark:border-gray-700">
                            <table className="min-w-full text-xs">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="py-1">Matière</th>
                                  <th className="py-1">Cr</th>
                                  <th className="py-1">CC</th>
                                  <th className="py-1">Ex</th>
                                  <th className="py-1">Rat</th>
                                  <th className="py-1">Rach</th>
                                  <th className="py-1">Note</th>
                                </tr>
                              </thead>
                              <tbody>
                                {u.elements.map((e) => (
                                  <tr key={e._id} className="border-t border-gray-100 dark:border-gray-800">
                                    <td className="py-1">{e.designation}</td>
                                    <td className="py-1">{e.credit}</td>
                                    <td className="py-1">{e.cc}</td>
                                    <td className="py-1">{e.examen}</td>
                                    <td className="py-1">{e.rattrapage}</td>
                                    <td className="py-1">{e.rachat}</td>
                                    <td className="py-1 font-semibold">{noteMatiere(e).toFixed(2)}</td>
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
    </div>
  );
}

