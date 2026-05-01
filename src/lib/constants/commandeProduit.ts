/**
 * Type de ligne « produit » pour une commande (activité titulaire ou ressource section).
 */
export const COMMANDE_PRODUIT_VALUES = [
  "activite",
  "sujet",
  "stage",
  "fiche-validation",
  "releve",
  "laboratoire",
  "session",
  "recours",
] as const;

export type CommandeProduit = (typeof COMMANDE_PRODUIT_VALUES)[number];

export function isCommandeProduit(value: unknown): value is CommandeProduit {
  return (
    typeof value === "string" &&
    (COMMANDE_PRODUIT_VALUES as readonly string[]).includes(value)
  );
}
