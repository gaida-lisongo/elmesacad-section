/** Tolérance flottante pour comparer des crédits (ECTS). */
export const CREDITS_COHERENCE_EPS = 1e-9;

/** Vrai si la somme des crédits matières dépasse le plafond de l’unité. */
export function creditsMatiereDepasseUnite(creditsUnite: number, sommeMatiere: number): boolean {
  return sommeMatiere > creditsUnite + CREDITS_COHERENCE_EPS;
}
