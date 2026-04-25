export const STUDENT_CYCLES = [
    "Science de Base",
    "Licence",
    "Master",
    "Doctorat",
] as const;

export type StudentCycle = (typeof STUDENT_CYCLES)[number];
