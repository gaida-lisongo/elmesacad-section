import ExcelJS from "exceljs";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";

export type CommandeExportPeriod = "daily" | "weekly" | "monthly" | "semester" | "annual";

export const PERIOD_OPTIONS: { value: CommandeExportPeriod; label: string }[] = [
  { value: "daily", label: "Journalier" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "semester", label: "Semestriel" },
  { value: "annual", label: "Annuel" },
];

export function filterRowsByPeriod(
  rows: SujetCommandeListRow[],
  period: CommandeExportPeriod,
  now: Date
): SujetCommandeListRow[] {
  const y = now.getFullYear();
  const mo = now.getMonth();
  const d = now.getDate();

  let start: Date;
  let end: Date;

  switch (period) {
    case "daily": {
      start = new Date(y, mo, d, 0, 0, 0, 0);
      end = new Date(y, mo, d, 23, 59, 59, 999);
      break;
    }
    case "weekly": {
      const dayOfWeek = now.getDay();
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(y, mo, d + diffToMonday);
      start = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0);
      end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      break;
    }
    case "monthly": {
      start = new Date(y, mo, 1, 0, 0, 0, 0);
      end = new Date(y, mo + 1, 0, 23, 59, 59, 999);
      break;
    }
    case "semester": {
      const firstHalf = mo < 6;
      if (firstHalf) {
        start = new Date(y, 0, 1, 0, 0, 0, 0);
        end = new Date(y, 6, 0, 23, 59, 59, 999);
      } else {
        start = new Date(y, 6, 1, 0, 0, 0, 0);
        end = new Date(y + 1, 0, 0, 23, 59, 59, 999);
      }
      break;
    }
    case "annual": {
      start = new Date(y, 0, 1, 0, 0, 0, 0);
      end = new Date(y + 1, 0, 0, 23, 59, 59, 999);
      break;
    }
  }

  return rows.filter((r) => {
    if (!r.createdAt) return false;
    const dt = new Date(r.createdAt);
    return dt >= start && dt <= end;
  });
}

function getPeriodLabel(period: CommandeExportPeriod): string {
  return PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}

export async function buildResourceCommandesExportWorkbook(args: {
  rows: SujetCommandeListRow[];
  period: CommandeExportPeriod;
  resourceDesignation: string;
  resourceId: string;
  generatedAt: Date;
}): Promise<Buffer> {
  const { rows, period, resourceDesignation, resourceId, generatedAt } = args;

  const wb = new ExcelJS.Workbook();
  wb.creator = "INBTP — Commandes";
  wb.created = generatedAt;

  const periodFr = getPeriodLabel(period);

  // Sheet 1 : Synthèse financière
  const synth = wb.addWorksheet("Synthèse", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  [36, 8, 12, 14, 14, 16].forEach((w, i) => synth.getColumn(i + 1).width = w);

  let r = 1;
  synth.getCell(r, 1).value = "Rapport des commandes — État financier";
  synth.getCell(r, 1).font = { bold: true, size: 14 };
  r += 2;

  const meta: [string, string][] = [
    ["Ressource", resourceDesignation],
    ["ID ressource", resourceId],
    ["Période", periodFr],
    ["Généré le (UTC)", generatedAt.toISOString()],
    ["Nombre de commandes", String(rows.length)],
  ];
  for (const [label, val] of meta) {
    synth.getCell(r, 1).value = label;
    synth.getCell(r, 1).font = { bold: true };
    synth.getCell(r, 2).value = val;
    r++;
  }
  r++;

  const headerR = r;
  const synthHeaders = ["", "Statut", "Nombre", "Montant USD", "Montant CDF"];
  synthHeaders.forEach((h, i) => {
    const c = synth.getCell(headerR, i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFEA" } };
  });
  r++;

  const paidRows = rows.filter((x) => (x.payment || "").toLowerCase() === "success");
  const pendingRows = rows.filter((x) => (x.payment || "").toLowerCase() !== "success");

  const usdAmount = (items: SujetCommandeListRow[]): number =>
    items.filter((x) => x.currency === "USD").reduce((s, x) => s + (x.amount || 0), 0);
  const cdfAmount = (items: SujetCommandeListRow[]): number =>
    items.filter((x) => x.currency === "CDF").reduce((s, x) => s + (x.amount || 0), 0);

  for (const [label, items] of [["Payé", paidRows], ["En attente", pendingRows], ["Total", rows]] as const) {
    synth.getCell(r, 2).value = label;
    synth.getCell(r, 3).value = items.length;
    synth.getCell(r, 4).value = usdAmount(items);
    synth.getCell(r, 5).value = cdfAmount(items);
    if (label === "Total") {
      for (let c = 2; c <= 5; c++) {
        const cell = synth.getCell(r, c);
        cell.font = { bold: true };
      }
    }
    r++;
  }

  // Sheet 2 : Détail des commandes
  const dataSheet = wb.addWorksheet("Détail", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const detailHeaders = [
    "N° Commande",
    "Référence",
    "Matricule",
    "Email étudiant",
    "Désignation",
    "Paiement",
    "Montant USD",
    "Montant CDF",
    "Date (ISO)",
  ];
  const colWidths = [18, 14, 16, 28, 24, 12, 12, 12, 24];
  detailHeaders.forEach((h, i) => {
    dataSheet.getColumn(i + 1).width = colWidths[i];
  });
  dataSheet.addRow(detailHeaders);
  dataSheet.getRow(1).font = { bold: true };
  dataSheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EFEA" } };

  for (const row of rows) {
    dataSheet.addRow([
      row.orderNumber || row.id.slice(-10),
      row.reference || "",
      row.matricule || "",
      row.studentEmail || "",
      row.designation || "",
      row.payment || "",
      Number((row as any).amountUsd ?? "") || "",
      Number((row as any).amountCdf ?? "") || "",
      row.createdAt || "",
    ]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}