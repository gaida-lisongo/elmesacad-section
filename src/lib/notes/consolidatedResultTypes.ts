export type ProgrammeMatiereContext = {
  key: string;
  matiere: { designation: string; reference: string; credits: number };
  unite: { designation: string; reference: string; code: string; credits: number };
  semestre: { designation: string; reference: string; credits: number };
};

/** Réponse normalisée après appel titulaire `/notes/student/:matricule`. */
export type StructuredNotesEntry = {
  ok: boolean;
  status: number;
  data: unknown | null;
  message?: string;
};

export type ConsolidatedStudentProfile = {
  nomComplet?: string;
  matricule?: string;
  email?: string;
  sexe?: string;
  nationalite?: string;
  anneeSlug?: string;
};
