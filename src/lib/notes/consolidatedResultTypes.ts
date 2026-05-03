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

/** Ligne matière pour export document (PDF, etc.) — aligné sur la vue consolidée. */
export type ConsolidatedDocumentMatiere = {
  matiereId: string;
  designation: string;
  credit: number;
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
  noteFinale: number;
};

export type ConsolidatedDocumentUnite = {
  uniteId: string;
  code: string;
  designation: string;
  credit: number;
  moyenne: number;
  matieres: ConsolidatedDocumentMatiere[];
};

export type ConsolidatedDocumentSemestre = {
  semestreId: string;
  designation: string;
  credit: number;
  unites: ConsolidatedDocumentUnite[];
};

/** Snapshot passé à `onGenerateDocument` pour générer un relevé / attestation. */
export type ConsolidatedResultDocumentPayload = {
  title: string;
  /** Nom affiché (profil ou payload notes). */
  nomAffiche: string;
  student: ConsolidatedStudentProfile | null;
  programmeName: string;
  programmeCredits: number;
  anneeLabel: string;
  mappingRows: ProgrammeMatiereContext[];
  notes: StructuredNotesEntry | undefined;
  synthese: {
    ncv: number;
    ncnv: number;
    pourcentage: number;
    mention: "A" | "B" | "C" | "D" | "E";
    decisionJury: string;
    nombreSemestres: number;
  };
  semestres: ConsolidatedDocumentSemestre[];
};
