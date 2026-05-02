/**
 * Affichage prix marketplace (CDF / USD).
 */
export function formatProductPrice(amount: number, currency: string): string {
  const cur = currency.toUpperCase() === "CDF" ? "CDF" : "USD";
  const n = Number(amount) || 0;
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })} ${cur}`;
}
