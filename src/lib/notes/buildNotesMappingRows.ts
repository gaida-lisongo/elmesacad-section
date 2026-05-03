import type { ProgrammeMatiereContext } from "@/lib/notes/consolidatedResultTypes";

/**
 * Construit les lignes plates `notes-mapping` à partir d’un programme Mongoose
 * déjà populé (semestres → unites → matieres), comme dans
 * `GET .../notes-mapping`.
 */
export function buildNotesMappingRowsFromPopulatedProgramme(
  programme: Record<string, unknown>
): ProgrammeMatiereContext[] {
  const semestres = Array.isArray(programme.semestres)
    ? (programme.semestres as Array<Record<string, unknown>>)
    : [];

  const rowsMap = new Map<string, ProgrammeMatiereContext>();
  for (const sem of semestres) {
    const semRef = String(sem._id ?? "");
    const semDes = String(sem.designation ?? "");
    const semCredits = Number(sem.credits ?? 0);
    const unites = Array.isArray(sem.unites) ? (sem.unites as Array<Record<string, unknown>>) : [];

    for (const ue of unites) {
      const ueRef = String(ue._id ?? "");
      const ueDes = String(ue.designation ?? "");
      const ueCode = String(ue.code ?? "");
      const ueCredits = Number(ue.credits ?? 0);
      const matieres = Array.isArray(ue.matieres) ? (ue.matieres as Array<Record<string, unknown>>) : [];

      for (const m of matieres) {
        const mRef = String(m._id ?? "");
        const mDes = String(m.designation ?? "").trim();
        if (!mRef || !mDes) continue;
        const key = `${semRef}|${ueRef}|${mRef}`;
        rowsMap.set(key, {
          key,
          matiere: {
            designation: mDes,
            reference: mRef,
            credits: Number(m.credits ?? 0),
          },
          unite: {
            designation: ueDes,
            reference: ueRef,
            code: ueCode,
            credits: ueCredits,
          },
          semestre: {
            designation: semDes,
            reference: semRef,
            credits: semCredits,
          },
        });
      }
    }
  }

  return [...rowsMap.values()];
}
