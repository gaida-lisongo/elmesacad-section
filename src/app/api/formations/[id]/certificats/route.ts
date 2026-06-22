import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FormationModel } from "@/lib/models/Formation";
import { ParticipantModel } from "@/lib/models/Participant";
import { StudentModel } from "@/lib/models/User";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";
import { resolvePublicOrigin } from "@/lib/ticket/buildTicketPublicUrl";

type RouteContext = { params: Promise<{ id: string }> };

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function certificateHtml(options: {
  titre: string;
  participantName: string;
  matricule?: string;
  mention: string;
  note: number;
  date: string;
  qrSvg: string;
}): string {
  const { titre, participantName, matricule, mention, note, date, qrSvg } = options;
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificat — ${escapeHtml(titre)}</title>
  <style>
    @page { size: A4 landscape; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: Georgia, "Times New Roman", serif; background: #f8fafc; }
    .page { width: 297mm; height: 210mm; padding: 18mm; position: relative; background: linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .border { position: absolute; inset: 12mm; border: 3px double #058ac5; border-radius: 12px; pointer-events: none; }
    .corner { position: absolute; width: 24px; height: 24px; border: 3px solid #058ac5; }
    .tl { top: 10mm; left: 10mm; border-right: none; border-bottom: none; }
    .tr { top: 10mm; right: 10mm; border-left: none; border-bottom: none; }
    .bl { bottom: 10mm; left: 10mm; border-right: none; border-top: none; }
    .br { bottom: 10mm; right: 10mm; border-left: none; border-top: none; }
    .badge { display: inline-block; padding: 8px 20px; border-radius: 999px; background: #058ac5; color: #fff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 18px; }
    h1 { font-size: 42px; font-weight: 700; color: #0f172a; margin: 0 0 10px; }
    .subtitle { font-size: 16px; color: #475569; margin-bottom: 32px; }
    .recipient { font-size: 34px; font-weight: 700; color: #058ac5; margin: 8px 0 6px; }
    .meta { font-size: 14px; color: #64748b; margin-bottom: 28px; }
    .details { display: flex; gap: 40px; justify-content: center; margin-bottom: 28px; }
    .detail { text-align: center; }
    .detail-value { font-size: 26px; font-weight: 700; color: #0f172a; }
    .detail-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #94a3b8; margin-top: 4px; }
    .qr { margin-top: 10px; }
    .qr svg { width: 90px; height: 90px; }
    .footer { position: absolute; bottom: 18mm; left: 0; right: 0; text-align: center; font-size: 11px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="page">
    <div class="border"></div>
    <div class="corner tl"></div><div class="corner tr"></div><div class="corner bl"></div><div class="corner br"></div>
    <span class="badge">Certificat de formation</span>
    <h1>${escapeHtml(titre)}</h1>
    <p class="subtitle">Ce certificat atteste que</p>
    <p class="recipient">${escapeHtml(participantName)}</p>
    ${matricule ? `<p class="meta">Matricule : ${escapeHtml(matricule)}</p>` : ""}
    <div class="details">
      <div class="detail">
        <div class="detail-value">${note}/20</div>
        <div class="detail-label">Note</div>
      </div>
      <div class="detail">
        <div class="detail-value">${escapeHtml(mention)}</div>
        <div class="detail-label">Mention</div>
      </div>
      <div class="detail">
        <div class="detail-value">${date}</div>
        <div class="detail-label">Date</div>
      </div>
    </div>
    <div class="qr">${qrSvg}</div>
    <p class="footer">Vérification en ligne : scannez le QR code</p>
  </div>
</body>
</html>
  `.trim();
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const payload = (await request.json()) as { participantIds?: string[] };
    const participantIds = Array.isArray(payload.participantIds) ? payload.participantIds : [];
    if (participantIds.length === 0) {
      return NextResponse.json({ message: "Aucun participant sélectionné" }, { status: 400 });
    }

    const formation = await FormationModel.findById(id).lean();
    if (!formation) {
      return NextResponse.json({ message: "Formation introuvable" }, { status: 404 });
    }

    const participants = await ParticipantModel.find({
      formation: new Types.ObjectId(id),
      _id: { $in: participantIds.map((pid) => new Types.ObjectId(pid)) },
    })
      .populate({ path: "user", model: StudentModel, select: "name matricule" })
      .lean();

    if (participants.length === 0) {
      return NextResponse.json({ message: "Participants introuvables" }, { status: 404 });
    }

    const origin = resolvePublicOrigin();
    const publicUrl = `${origin}/formations/${formation.slug}`;

    const pages = participants.map((p) => {
      const user = (p.user ?? {}) as { name?: string; matricule?: string };
      const qrSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 33 33" shape-rendering="crispEdges"><rect width="33" height="33" fill="#ffffff"/><path fill="#000000" d="M4 4h7v1H4zm8 0h1v1H12zm2 0h1v1H14zm1 0h2v1H15zm3 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 5h1v1H4zm10 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 6h1v1H4zm2 0h1v1H6zm3 0h2v1H8zm2 0h1v1H10zm1 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 7h1v1H4zm2 0h1v1H6zm3 0h1v1H9zm2 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 8h1v1H4zm2 0h1v1H6zm3 0h1v1H9zm2 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 9h1v1H4zm10 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 10h7v1H4zm8 0h1v1H12zm2 0h1v1H14zm1 0h2v1H15zm3 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM12 11h1v1H12zm2 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 12h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1H10zm2 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 13h1v1H4zm2 0h1v1H6zm2 0h1v1H8zm2 0h1v1H10zm1 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 14h1v1H4zm1 0h1v1H5zm2 0h1v1H7zm2 0h1v1H9zm2 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 15h1v1H4zm2 0h1v1H6zm2 0h1v1H8zm2 0h1v1H10zm1 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 16h1v1H4zm1 0h1v1H5zm1 0h1v1H6zm1 0h1v1H7zm1 0h1v1H8zm1 0h1v1H9zm1 0h1v1H10zm2 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM12 17h1v1H12zm2 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 18h7v1H4zm8 0h1v1H12zm2 0h1v1H14zm1 0h2v1H15zm3 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 19h1v1H4zm10 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 20h1v1H4zm2 0h1v1H6zm3 0h2v1H8zm2 0h1v1H10zm1 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 21h1v1H4zm2 0h1v1H6zm3 0h1v1H9zm2 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 22h1v1H4zm2 0h1v1H6zm3 0h1v1H9zm2 0h1v1H11zm1 0h1v1H12zm1 0h1v1H13zm1 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 23h1v1H4zm10 0h1v1H14zm1 0h1v1H15zm1 0h1v1H16zm1 0h1v1H17zm1 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26zM4 24h7v1H4zm8 0h1v1H12zm2 0h1v1H14zm1 0h2v1H15zm3 0h1v1H18zm1 0h1v1H19zm1 0h1v1H20zm1 0h1v1H21zm1 0h1v1H22zm1 0h1v1H23zm1 0h1v1H24zm1 0h1v1H25zm1 0h1v1H26z"/></svg>`;
      return certificateHtml({
        titre: String(formation.titre ?? ""),
        participantName: user.name ?? "Participant",
        matricule: user.matricule,
        mention: String(p.mention ?? "—"),
        note: Number.isFinite(Number(p.note)) ? Number(p.note) : 0,
        date: new Date(p.completedAt ?? p.createdAt ?? Date.now()).toLocaleDateString("fr-FR"),
        qrSvg,
      });
    });

    const fullHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Certificats — ${escapeHtml(String(formation.titre ?? ""))}</title>
  <style>@page { size: A4 landscape; margin: 0; } body { margin: 0; } .page { page-break-after: always; } .page:last-child { page-break-after: auto; }</style>
</head>
<body>
  ${pages.join("\n")}
</body>
</html>
    `.trim();

    const puppeteer = await import("puppeteer");
    const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page = await browser.newPage();
    await page.setContent(fullHtml, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({ format: "A4", landscape: true, printBackground: true });
    await browser.close();

    const filename = `certificats-${String(formation.slug ?? "formation")}.pdf`;
    return NextResponse.json({ pdfBase64: Buffer.from(pdfBuffer).toString("base64"), filename });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to generate certificates", error: (error as Error).message },
      { status: 500 }
    );
  }
}
