import { STUDENT_CYCLES } from "@/lib/constants/studentCycles";

/** Cycles pédagogiques (alignés sur les étudiants). */
export const SECTION_CYCLE_TABS: { label: string; value: string }[] = [
  { label: "Tous", value: "all" },
  ...STUDENT_CYCLES.map((c) => ({ label: c, value: c })),
];

export const DEFAULT_SECTION_CYCLE_FOR_CREATE = "B.T.P" as const;
