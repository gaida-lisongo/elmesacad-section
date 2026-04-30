export type TeacherQcmQuestion = {
  enonce?: string;
  options?: string[];
  reponse?: string;
};

export type StudentQcmAnswer = {
  qcm_id?: string;
  reponse?: string;
};

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * Corrige un QCM par position (question i <-> réponse i).
 * Chaque question a le même poids: note_max / total_questions.
 */
export function gradeQcmResolution(args: {
  noteMaximale: number;
  questions: TeacherQcmQuestion[];
  answers: StudentQcmAnswer[];
}): { note: number; totalQuestions: number; correctCount: number } {
  const questions = Array.isArray(args.questions) ? args.questions : [];
  const answers = Array.isArray(args.answers) ? args.answers : [];
  const total = questions.length;
  if (total <= 0) return { note: 0, totalQuestions: 0, correctCount: 0 };

  const perQuestion = Number(args.noteMaximale ?? 0) / total;
  let correct = 0;
  for (let i = 0; i < total; i += 1) {
    const expected = normalizeText(questions[i]?.reponse ?? "");
    const given = normalizeText(answers[i]?.reponse ?? "");
    if (expected && given && expected === given) {
      correct += 1;
    }
  }
  const note = Number((correct * perQuestion).toFixed(2));
  return { note, totalQuestions: total, correctCount: correct };
}
