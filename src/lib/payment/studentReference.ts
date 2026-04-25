/**
 * Référence de paiement unique par recharge (matricule + email + id de la ligne Recharge).
 */
export function buildStudentDepositReference(
  matricule: string,
  email: string,
  rechargeId: string
): string {
  const m = (matricule || "").trim();
  const e = (email || "").trim();
  const id = (rechargeId || "").replace(/[^a-fA-F0-9]/g, "");
  return `${m}/${e}#R${id}`;
}
