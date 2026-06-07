import ExcelJS from "exceljs";
import type { OrderData } from "@/app/(site)/(secure)/demandes/_components/OrderCard";

export type SessionExportPeriod =
  | "daily"
  | "weekly"
  | "monthly"
  | "semester"
  | "annual"
  | "custom";

export const SESSION_PERIOD_OPTIONS: { value: SessionExportPeriod; label: string }[] = [
  { value: "daily", label: "Journalier" },
  { value: "weekly", label: "Hebdomadaire" },
  { value: "monthly", label: "Mensuel" },
  { value: "semester", label: "Semestriel" },
  { value: "annual", label: "Annuel" },
  { value: "custom", label: "Période personnalisée" },
];

function getPeriodLabel(period: SessionExportPeriod): string {
  return SESSION_PERIOD_OPTIONS.find((o) => o.value === period)?.label ?? period;
}

/**
 * Filtre les commandes sur une période donnée (dates incluses).
 * Si `period === "custom"`, utilise `customStart` / `customEnd`.
 */
export function filterOrdersByPeriod(
  orders: OrderData[],
  period: SessionExportPeriod,
  now: Date,
  customStart?: Date,
  customEnd?: Date
): OrderData[] {
  if (period === "custom") {
    if (!customStart || !customEnd) return orders;
    const end = new Date(customEnd);
    end.setHours(23, 59, 59, 999);
    return orders.filter((o) => {
      const dt = new Date(o.createdAt);
      return dt >= customStart && dt <= end;
    });
  }

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

  return orders.filter((o) => {
    const dt = new Date(o.createdAt);
    return dt >= start && dt <= end;
  });
}

// ─── Couleurs du thème INBTP ──────────────────────────────────────────
const THEME = {
  primary: { argb: "FF1A3A5C" },      // Bleu foncé INBTP
  accent: { argb: "FF2E7D32" },         // Vert pour les montants
  lightBg: { argb: "FFF0F4F8" },        // Fond bleuté clair
  headerBg: { argb: "FF1A3A5C" },       // Entête foncé
  headerText: { argb: "FFFFFFFF" },
  successBg: { argb: "FFE8F5E9" },
  warningBg: { argb: "FFFFF3E0" },
  border: { argb: "FFDEE2E6" },
};

export async function buildSessionOrdersExportWorkbook(args: {
  orders: OrderData[];
  designation: string;
  resourceId: string;
  period: SessionExportPeriod;
  periodLabel: string;
  generatedAt: Date;
}): Promise<Buffer> {
  const { orders, designation, resourceId, period, periodLabel, generatedAt } = args;

  const wb = new ExcelJS.Workbook();
  wb.creator = "INBTP — Sessions";
  wb.created = generatedAt;

  // ── Styles partagés ──────────────────────────────────────────────
  const borderStyle: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: THEME.border },
    bottom: { style: "thin", color: THEME.border },
    left: { style: "thin", color: THEME.border },
    right: { style: "thin", color: THEME.border },
  };

  const titleFont: Partial<ExcelJS.Font> = { bold: true, size: 16, color: THEME.primary, name: "Calibri" };
  const subtitleFont: Partial<ExcelJS.Font> = { italic: true, size: 10, color: { argb: "FF666666" }, name: "Calibri" };
  const headerFont: Partial<ExcelJS.Font> = { bold: true, size: 11, color: THEME.headerText, name: "Calibri" };
  const dataFont: Partial<ExcelJS.Font> = { size: 10, name: "Calibri" };
  const boldFont: Partial<ExcelJS.Font> = { bold: true, size: 10, name: "Calibri" };

  // ════════════════════════════════════════════════════════════════════
  //  SHEET 1 : SYNTHÈSE
  // ════════════════════════════════════════════════════════════════════
  const synth = wb.addWorksheet("Rapport", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  // Largeurs de colonnes
  synchColumnWidths(synth, [40, 8, 16, 18, 18, 20]);

  // ── En-tête du rapport ──
  let r = 1;
  synth.mergeCells(r, 1, r, 6);
  const titleCell = synth.getCell(r, 1);
  titleCell.value = "Rapport des commandes — Session d'examen";
  titleCell.font = titleFont;
  synth.getRow(r).height = 30;
  r++;

  synth.mergeCells(r, 1, r, 6);
  synth.getCell(r, 1).value = designation;
  synth.getCell(r, 1).font = subtitleFont;
  r += 2;

  // ── Informations générales ──
  const meta: [string, string][] = [
    ["Session", designation],
    ["ID ressource", resourceId],
    ["Période", periodLabel],
    ["Généré le", generatedAt.toLocaleString("fr-FR")],
    ["Nombre total de commandes", String(orders.length)],
  ];

  for (const [label, val] of meta) {
    synth.getCell(r, 1).value = label;
    synth.getCell(r, 1).font = boldFont;
    synth.getCell(r, 1).fill = { type: "pattern", pattern: "solid", fgColor: THEME.lightBg };
    synth.mergeCells(r, 2, r, 4);
    synth.getCell(r, 2).value = val;
    synth.getCell(r, 2).font = dataFont;
    synth.getCell(r, 2).alignment = { wrapText: true };
    // Bordure
    for (let c = 1; c <= 6; c++) {
      synth.getCell(r, c).border = borderStyle;
    }
    r++;
  }
  r++;

  // ── Synthèse financière ──
  synth.mergeCells(r, 1, r, 6);
  synth.getCell(r, 1).value = "Synthèse financière";
  synth.getCell(r, 1).font = { bold: true, size: 13, color: THEME.primary, name: "Calibri" };
  r++;

  // Calcul des stats
  const paidOrders = orders.filter((o) => o.status === "paid");
  const pendingOrders = orders.filter((o) => o.status === "pending" || o.status === "completed");
  const failedOrders = orders.filter((o) => o.status === "failed");

  const totalAmount = orders.reduce((s, o) => s + (Number(o.transaction.amount) || 0), 0);
  const paidAmount = paidOrders.reduce((s, o) => s + (Number(o.transaction.amount) || 0), 0);

  // En-têtes du tableau
  const statHeaders = ["Statut", "", "Nombre", "Montant", "Devise", "%"];
  statHeaders.forEach((h, i) => {
    const cell = synth.getCell(r, i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: THEME.headerBg };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderStyle;
  });
  synth.getRow(r).height = 22;
  r++;

  // Lignes de statuts
  const statRows: { label: string; items: OrderData[]; bg: { argb: string } }[] = [
    { label: "Payées", items: paidOrders, bg: THEME.successBg },
    { label: "En attente", items: pendingOrders, bg: THEME.warningBg },
    { label: "Échouées", items: failedOrders, bg: { argb: "FFFFEBEE" } },
  ];

  for (const { label, items, bg } of statRows) {
    const amount = items.reduce((s, o) => s + (Number(o.transaction.amount) || 0), 0);
    const pct = orders.length > 0 ? ((items.length / orders.length) * 100).toFixed(1) : "0.0";
const vals = [label, "", items.length, amount, items[0]?.transaction?.currency ?? "—", pct + "%"];
    vals.forEach((v, i) => {
      const cell = synth.getCell(r, i + 1);
      cell.value = v;
      cell.font = i === 0 ? boldFont : dataFont;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: bg };
      cell.border = borderStyle;
      if (i >= 2) cell.alignment = { horizontal: "center" };
    });
    r++;
  }

  // Ligne totale
  const totalPct = orders.length > 0 ? "100.0" : "0.0";
  const totalVals = ["TOTAL", "", orders.length, totalAmount, orders[0]?.transaction?.currency ?? "—", totalPct + "%"];
  totalVals.forEach((v, i) => {
    const cell = synth.getCell(r, i + 1);
    cell.value = v;
    cell.font = { bold: true, size: 11, name: "Calibri", color: THEME.primary };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3EAF3" } };
    cell.border = borderStyle;
    if (i >= 2) cell.alignment = { horizontal: "center" };
  });
  r += 2;

  // ── Top payeurs ──
  if (paidOrders.length > 0) {
    synth.mergeCells(r, 1, r, 6);
    synth.getCell(r, 1).value = "Top payeurs";
    synth.getCell(r, 1).font = { bold: true, size: 13, color: THEME.primary, name: "Calibri" };
    r++;

    const topHeaders = ["Étudiant", "", "Matricule", "Email", "Montant", "Date"];
    topHeaders.forEach((h, i) => {
      const cell = synth.getCell(r, i + 1);
      cell.value = h;
      cell.font = headerFont;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: THEME.headerBg };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderStyle;
    });
    synth.getRow(r).height = 22;
    r++;

    const topPaid = [...paidOrders]
      .sort((a, b) => (Number(b.transaction.amount) || 0) - (Number(a.transaction.amount) || 0))
      .slice(0, 10);

    for (const o of topPaid) {
      const vals = [
        o.student.nom,
        "",
        o.student.matricule,
        o.student.email,
        Number(o.transaction.amount) || 0,
        new Date(o.createdAt).toLocaleDateString("fr-FR"),
      ];
      vals.forEach((v, i) => {
        const cell = synth.getCell(r, i + 1);
        cell.value = v;
        cell.font = dataFont;
        cell.border = borderStyle;
        if (i >= 4) cell.alignment = { horizontal: "center" };
      });
      r++;
    }
  }

  // ════════════════════════════════════════════════════════════════════
  //  SHEET 2 : DÉTAIL DES COMMANDES
  // ════════════════════════════════════════════════════════════════════
  const dataSheet = wb.addWorksheet("Détail des commandes", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const detailCols = [18, 16, 24, 32, 14, 12, 14, 14, 18, 14];
  detailCols.forEach((w, i) => (dataSheet.getColumn(i + 1).width = w));

  const detailHeaders = [
    "N° Commande",
    "Matricule",
    "Nom étudiant",
    "Email",
    "Téléphone",
    "Statut",
    "Montant",
    "Devise",
    "Date",
    "Recharge ID",
  ];

  detailHeaders.forEach((h, i) => {
    const cell = dataSheet.getCell(1, i + 1);
    cell.value = h;
    cell.font = headerFont;
    cell.fill = { type: "pattern", pattern: "solid", fgColor: THEME.headerBg };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderStyle;
  });
  dataSheet.getRow(1).height = 24;

  for (const o of orders) {
    const row = dataSheet.addRow([
      o.transaction.orderNumber,
      o.student.matricule,
      o.student.nom,
      o.student.email,
      o.transaction.phoneNumber,
      o.status,
      Number(o.transaction.amount) || 0,
      o.transaction.currency,
      new Date(o.createdAt).toLocaleDateString("fr-FR"),
      o.rechargeId || "",
    ]);

    row.eachCell((cell) => {
      cell.font = dataFont;
      cell.border = borderStyle;
      cell.alignment = { vertical: "middle" };
    });

    // Coloration par statut
    const statusCell = row.getCell(6);
    if (o.status === "paid") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: THEME.successBg };
      statusCell.font = { ...dataFont, bold: true, color: { argb: "FF2E7D32" } };
    } else if (o.status === "failed") {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEBEE" } };
      statusCell.font = { ...dataFont, bold: true, color: { argb: "FFC62828" } };
    } else {
      statusCell.fill = { type: "pattern", pattern: "solid", fgColor: THEME.warningBg };
      statusCell.font = { ...dataFont, bold: true, color: { argb: "FFE65100" } };
    }

    // Montant en gras
    row.getCell(7).font = { ...dataFont, bold: true, color: THEME.accent };
    row.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
  }

  // Ligne de totaux en pied
  const footerRow = dataSheet.addRow([]);
  const totalRow = dataSheet.addRow([
    "",
    "",
    "",
    "",
    "TOTAL",
    "",
    orders.reduce((s, o) => s + (Number(o.transaction.amount) || 0), 0),
    orders[0]?.transaction?.currency ?? "",
    orders.length + " commandes",
    "",
  ]);
  totalRow.eachCell((cell, col) => {
    cell.font = { bold: true, size: 11, name: "Calibri", color: THEME.primary };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE3EAF3" } };
    cell.border = {
      top: { style: "medium", color: THEME.primary },
      bottom: { style: "medium", color: THEME.primary },
      left: { style: "thin", color: THEME.border },
      right: { style: "thin", color: THEME.border },
    };
    if (col >= 6) cell.alignment = { horizontal: "center" };
  });

  // ── Filigrane / footer ──
  dataSheet.getRow(totalRow.number + 2).getCell(1).value = "Rapport généré par INBTP — Gestion des sessions d'examen";
  dataSheet.getRow(totalRow.number + 2).getCell(1).font = subtitleFont;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function synchColumnWidths(ws: ExcelJS.Worksheet, widths: number[]) {
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
}