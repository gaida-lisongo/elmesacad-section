/**
 * Types partagés pour les pages de modalités de paiement
 */

export type ResourceType = "session" | "validation" | "releve" | "labo";

export type ResourceFraisItem = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  brandingSectionRef: string;
  // Champs spécifiques par type
  matieresCount?: number;
  matieresSummary?: string;
  programmeClasse?: string;
  programmeFiliere?: string;
  programmeCredits?: number;
  anneeSlug?: string;
  matiereReference?: string;
  matiereCredit?: number;
  lecteursLabel?: string;
};

export type ModalitesTab = {
  label: string;
  value: ResourceType;
  icon: string;
  description: string;
};

export const MODALITES_TABS: ModalitesTab[] = [
  {
    label: "Sessions",
    value: "session",
    icon: "solar:calendar-date-bold-duotone",
    description: "Sessions d'enrôlement et examens",
  },
  {
    label: "Validations",
    value: "validation",
    icon: "solar:checklist-bold-duotone",
    description: "Fiches de validation des acquis",
  },
  {
    label: "Relevés",
    value: "releve",
    icon: "solar:document-text-bold-duotone",
    description: "Relevés de cotes et résultats",
  },
  {
    label: "Laboratoires",
    value: "labo",
    icon: "solar:flask-bold-duotone",
    description: "Bons de laboratoire et travaux pratiques",
  },
];
