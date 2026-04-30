import ExcelJS from "exceljs";
import type { PresenceRowView } from "@/actions/titulairePresences";

const STATUS_FR: Record<PresenceRowView["status"], string> = {
  present: "Présent",
  absent: "Absent",
  late: "En retard",
  early: "Sortie anticipée",
  excused: "Excusé",
};

export type SeanceExportMeta = {
  id: string;
  label: string;
  dateSeance: string;
  jour: string;
  heureDebut: string;
  heureFin: string;
  salle: string;
};

/**
 * Classeur Excel : bloc infos séance puis tableau des présences (pour l’enseignant).
 */
export async function buildPresencesSeanceXlsxBuffer(args: {
  seance: SeanceExportMeta;
  rows: PresenceRowView[];
}): Promise<ArrayBuffer> {
  const { seance, rows } = args;
  const wb = new ExcelJS.Workbook();
  wb.creator = "INBTP — Présences";
  wb.created = new Date();

  const ws = wb.addWorksheet("Présences", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  [12, 36, 22, 24, 14, 12, 12].forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  let r = 1;
  ws.getCell(r, 1).value = "Export présences — séance";
  ws.getCell(r, 1).font = { bold: true, size: 14 };
  r += 2;

  const infos: [string, string][] = [
    ["ID séance", seance.id],
    ["Leçon", seance.label],
    ["Date / heure séance", seance.dateSeance],
    ["Jour", seance.jour],
    ["Heure début", seance.heureDebut],
    ["Heure fin", seance.heureFin],
    ["Salle", seance.salle || "—"],
    ["Nombre de déclarations", String(rows.length)],
    ["Généré le (UTC)", new Date().toISOString()],
  ];
  for (const [label, val] of infos) {
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { bold: true };
    ws.getCell(r, 2).value = val;
    r += 1;
  }
  r += 1;

  const headerRow = r;
  const headers = [
    "Matricule",
    "Email",
    "Matière",
    "Date déclaration (UTC)",
    "Statut",
    "Longitude",
    "Latitude",
  ];
  headers.forEach((h, i) => {
    const c = ws.getCell(headerRow, i + 1);
    c.value = h;
    c.font = { bold: true };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE8EFEA" },
    };
  });
  r += 1;

  for (const row of rows) {
    const [lng, lat] = row.coordinates ?? [null, null];
    ws.getCell(r, 1).value = row.matricule;
    ws.getCell(r, 2).value = row.email;
    ws.getCell(r, 3).value = row.matiere;
    ws.getCell(r, 4).value = row.date;
    ws.getCell(r, 5).value = STATUS_FR[row.status] ?? row.status;
    ws.getCell(r, 6).value = lng != null && Number.isFinite(lng) ? lng : "";
    ws.getCell(r, 7).value = lat != null && Number.isFinite(lat) ? lat : "";
    r += 1;
  }

  const buf = await wb.xlsx.writeBuffer();
  return buf as ArrayBuffer;
}
