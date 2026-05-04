/**
 * Formats a date string or Date object into a long natural French format.
 * Example: "12 février 2026"
 */
export function formatNaturalDate(value: string | Date | undefined | null): string {
  if (!value) return "Non définie";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Formats a date string or Date object into a short French format.
 * Example: "12 fév. 2026"
 */
export function formatShortDate(value: string | Date | undefined | null): string {
  if (!value) return "Non définie";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/**
 * Standard French date format.
 * Example: "12/02/2026"
 */
export function formatStandardDate(value: string | Date | undefined | null): string {
  if (!value) return "Non définie";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("fr-FR");
}
