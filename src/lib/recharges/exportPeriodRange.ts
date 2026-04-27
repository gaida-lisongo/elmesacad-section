export type RechargeExportPeriod = "daily" | "monthly" | "semester" | "annual";

const PERIOD_LABELS: Record<RechargeExportPeriod, string> = {
  daily: "Journalier",
  monthly: "Mensuel",
  semester: "Semestriel",
  annual: "Annuel",
};

export function isRechargeExportPeriod(s: string): s is RechargeExportPeriod {
  return s === "daily" || s === "monthly" || s === "semester" || s === "annual";
}

/** `YYYY-MM-DD` → date à midi UTC (référence stable pour mois / semestre / année). */
export function parseExportReferenceDate(isoDay: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDay)) return null;
  const [y, m, d] = isoDay.split("-").map(Number);
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const t = Date.UTC(y, m - 1, d, 12, 0, 0, 0);
  const check = new Date(t);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) {
    return null;
  }
  return new Date(t);
}

/**
 * Plages en UTC (calendrier grégorien). Semestre = 1er janv.–30 juin / 1er juil.–31 déc.
 */
export function getRechargeExportRange(
  period: RechargeExportPeriod,
  ref: Date
): { start: Date; end: Date; labelFr: string; periodTypeFr: string } {
  const y = ref.getUTCFullYear();
  const mo = ref.getUTCMonth();
  const day = ref.getUTCDate();
  const periodTypeFr = PERIOD_LABELS[period];

  switch (period) {
    case "daily": {
      const start = new Date(Date.UTC(y, mo, day, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, mo, day, 23, 59, 59, 999));
      const labelFr = `${String(day).padStart(2, "0")}/${String(mo + 1).padStart(2, "0")}/${y} (UTC)`;
      return { start, end, labelFr, periodTypeFr };
    }
    case "monthly": {
      const start = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, mo + 1, 0, 23, 59, 59, 999));
      const labelFr = `${String(mo + 1).padStart(2, "0")}/${y} (UTC)`;
      return { start, end, labelFr, periodTypeFr };
    }
    case "semester": {
      const firstHalf = mo < 6;
      if (firstHalf) {
        const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
        const end = new Date(Date.UTC(y, 6, 0, 23, 59, 59, 999));
        const labelFr = `1er semestre ${y} (janv.–juin, UTC)`;
        return { start, end, labelFr, periodTypeFr };
      }
      const start = new Date(Date.UTC(y, 6, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, 12, 0, 23, 59, 59, 999));
      const labelFr = `2e semestre ${y} (juil.–déc., UTC)`;
      return { start, end, labelFr, periodTypeFr };
    }
    case "annual": {
      const start = new Date(Date.UTC(y, 0, 1, 0, 0, 0, 0));
      const end = new Date(Date.UTC(y, 12, 0, 23, 59, 59, 999));
      const labelFr = `Année civile ${y} (UTC)`;
      return { start, end, labelFr, periodTypeFr };
    }
  }
}

export function exportFilenameSlug(period: RechargeExportPeriod, isoDay: string): string {
  const safe = isoDay.replace(/[^0-9-]/g, "");
  return `recharges-rapport-${period}-${safe}.xlsx`;
}
