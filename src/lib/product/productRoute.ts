/**
 * Segments d’URL `/product/[categorie]` : activités (titulaire) vs ressources (service étudiant).
 */

export const ACTIVITY_PRODUCT_SLUGS = ["qcm", "tp"] as const;
export type ActivityProductSlug = (typeof ACTIVITY_PRODUCT_SLUGS)[number];

/** Slugs d’URL acceptés pour les ressources `GET /api/resources/:id` (`categorie` métier). */
export const ETUDIANT_RESOURCE_URL_SLUGS = [
  "sujet",
  "stage",
  "validation",
  "fiche-validation",
  "releve",
  "labo",
  "laboratoire",
  "session",
] as const;

export type EtudiantResourceUrlSlug = (typeof ETUDIANT_RESOURCE_URL_SLUGS)[number];

export type EtudiantResourceApiCategorie =
  | "sujet"
  | "stage"
  | "validation"
  | "releve"
  | "labo"
  | "session";

export function normalizeProductCategorySegment(raw: string): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

export function isActivityProductCategory(segment: string): segment is ActivityProductSlug {
  const s = normalizeProductCategorySegment(segment);
  return (ACTIVITY_PRODUCT_SLUGS as readonly string[]).includes(s);
}

const URL_SLUG_TO_API: Record<string, EtudiantResourceApiCategorie> = {
  sujet: "sujet",
  stage: "stage",
  validation: "validation",
  "fiche-validation": "validation",
  releve: "releve",
  relève: "releve",
  labo: "labo",
  laboratoire: "labo",
  session: "session",
};

export function etudiantResourceApiCategorieFromUrl(
  segment: string
): EtudiantResourceApiCategorie | null {
  const s = normalizeProductCategorySegment(segment);
  return URL_SLUG_TO_API[s] ?? null;
}

export function humanizeProductCategory(segment: string): string {
  const s = normalizeProductCategorySegment(segment);
  const labels: Record<string, string> = {
    qcm: "QCM",
    tp: "Travaux pratiques",
    sujet: "Sujet de recherche",
    stage: "Stage",
    validation: "Fiche de validation",
    "fiche-validation": "Fiche de validation",
    releve: "Relevé de cotes",
    relève: "Relevé de cotes",
    labo: "Laboratoire",
    laboratoire: "Laboratoire",
    session: "Session d'enrôlement",
  };
  return labels[s] ?? segment;
}
