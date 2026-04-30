import ExcelJS from "exceljs";
import type { ResolutionRow } from "@/actions/titulaireActivites";

export async function buildActiviteResolutionsXlsxBuffer(args: {
  activite: {
    id: string;
    categorie: "TP" | "QCM" | string;
    noteMaximale: number;
    dateRemise: string;
    status: string;
  };
  rows: ResolutionRow[];
}): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "INBTP — Résolutions";
  wb.created = new Date();
  const ws = wb.addWorksheet("Résolutions", { views: [{ state: "frozen", ySplit: 1 }] });

  [16, 12, 12, 22, 28, 18, 10, 14].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let r = 1;
  ws.getCell(r, 1).value = "Export des résolutions activité";
  ws.getCell(r, 1).font = { bold: true, size: 14 };
  r += 2;

  const infos: [string, string][] = [
    ["Activité ID", args.activite.id],
    ["Catégorie", args.activite.categorie],
    ["Statut activité", args.activite.status || "—"],
    ["Note maximale", String(args.activite.noteMaximale ?? 0)],
    ["Date remise", args.activite.dateRemise || "—"],
    ["Soumissions", String(args.rows.length)],
    ["Généré le (UTC)", new Date().toISOString()],
  ];
  for (const [k, v] of infos) {
    ws.getCell(r, 1).value = k;
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = v;
    r += 1;
  }
  r += 1;

  const headers = ["Résolution ID", "Matricule", "Email", "Matière(commande)", "Soumis le", "Statut", "Note", "Sur"];
  headers.forEach((h, i) => {
    const c = ws.getCell(r, i + 1);
    c.value = h;
    c.font = { bold: true };
  });
  r += 1;

  for (const row of args.rows) {
    ws.getCell(r, 1).value = row.id;
    ws.getCell(r, 2).value = row.matricule;
    ws.getCell(r, 3).value = row.email;
    ws.getCell(r, 4).value = row.matiere;
    ws.getCell(r, 5).value = row.submittedAt;
    ws.getCell(r, 6).value = row.status ? "Validé" : "En attente";
    ws.getCell(r, 7).value = Number.isFinite(row.note) ? row.note : 0;
    ws.getCell(r, 8).value = args.activite.noteMaximale ?? 0;
    r += 1;
  }

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}
