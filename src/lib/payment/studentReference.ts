/**
 * Référence de paiement unique par recharge : id Mongo (24 caractères hex).
 * L’unicité et le lien avec la ligne `recharges` viennent de cet id ; matricule / e-mail
 * restent en base côté serveur (pas besoin de les répéter dans la ref fournisseur).
 */
export function buildStudentDepositReference(
  _matricule: string,
  _email: string,
  rechargeId: string
): string {
  const id = (rechargeId || "").replace(/[^a-fA-F0-9]/g, "");
  if (id.length === 24) {
    return id;
  }
  return id.length > 0 ? id : "invalid";
}
