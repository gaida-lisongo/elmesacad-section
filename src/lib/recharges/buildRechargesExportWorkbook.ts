import ExcelJS from "exceljs";
import type { AdminRechargeListItem } from "@/lib/services/UserManager";

type Status = "pending" | "paid" | "failed";

function sumByStatusCurrency(items: AdminRechargeListItem[], status: Status, currency: "USD" | "CDF"): number {
  return items
    .filter((r) => r.status === status && r.currency === currency)
    .reduce((s, r) => s + (Number(r.amount) || 0), 0);
}

function countByStatus(items: AdminRechargeListItem[], status: Status): number {
  return items.filter((r) => r.status === status).length;
}

export async function buildRechargesExportWorkbook(args: {
  items: AdminRechargeListItem[];
  periodTypeFr: string;
  rangeLabelFr: string;
  generatedAt: Date;
}): Promise<Buffer> {
  const { items, periodTypeFr, rangeLabelFr, generatedAt } = args;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Tableau de bord";
  wb.created = generatedAt;

  const synth = wb.addWorksheet("Synthèse", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ;[36, 8, 12, 14, 14].forEach((w, i) => {
    synth.getColumn(i + 1).width = w;
  });

  synth.addRow(["Rapport des recharges"]);
  synth.getRow(1).font = { bold: true, size: 14 };
  synth.addRow([]);
  synth.addRow(["Type de période", periodTypeFr]);
  synth.addRow(["Période couverte", rangeLabelFr]);
  synth.addRow(["Généré le (UTC)", generatedAt.toISOString()]);
  synth.addRow(["Nombre de lignes (sources)", String(items.length)]);
  synth.addRow([]);

  const statHead = synth.addRow(["Synthèse par statut", "", "Nombre", "Montant USD", "Montant CDF"]);
  statHead.font = { bold: true };

  const statuses: { key: Status; label: string }[] = [
    { key: "paid", label: "Payé" },
    { key: "pending", label: "En attente" },
    { key: "failed", label: "Échoué" },
  ];

  for (const { key, label } of statuses) {
    const n = countByStatus(items, key);
    const usd = sumByStatusCurrency(items, key, "USD");
    const cdf = sumByStatusCurrency(items, key, "CDF");
    synth.addRow(["", label, n, usd, cdf]);
  }

  synth.addRow([]);
  const totHead = synth.addRow(["Totaux (toutes lignes, tous statuts)", "", "", "", ""]);
  totHead.font = { bold: true };
  const totalUsd = items.filter((r) => r.currency === "USD").reduce((s, r) => s + r.amount, 0);
  const totalCdf = items.filter((r) => r.currency === "CDF").reduce((s, r) => s + r.amount, 0);
  synth.addRow(["", "Volume total USD", "", totalUsd, ""]);
  synth.addRow(["", "Volume total CDF", "", totalCdf, ""]);

  const dataSheet = wb.addWorksheet("Données sources", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const headers = [
    "ID recharge",
    "ID étudiant",
    "Nom étudiant",
    "Matricule",
    "E-mail",
    "Montant",
    "Devise",
    "Statut",
    "Téléphone",
    "N° commande",
    "Date création (ISO)",
  ];
  dataSheet.addRow(headers);
  dataSheet.getRow(1).font = { bold: true };
  [
    14, 14, 22, 14, 28, 10, 8, 12, 16, 18, 24,
  ].forEach((w, i) => {
    dataSheet.getColumn(i + 1).width = w;
  });

  for (const r of items) {
    dataSheet.addRow([
      r.id,
      r.studentId,
      r.studentName,
      r.studentMatricule,
      r.studentEmail,
      r.amount,
      r.currency,
      r.status,
      r.phoneNumber,
      r.orderNumber ?? "",
      r.createdAt,
    ]);
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
