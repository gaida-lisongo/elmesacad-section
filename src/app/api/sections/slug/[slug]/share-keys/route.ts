import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { getSessionPayload, canEditSensitiveFields } from "@/lib/auth/sessionServer";
import { sendMail } from "@/lib/mail/Mail";

type Ctx = { params: Promise<{ slug: string }> };

const emailOk = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export async function POST(request: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canEditSensitiveFields(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ message: "Slug manquant" }, { status: 400 });
  }

  let body: { to?: string };
  try {
    body = (await request.json()) as { to?: string };
  } catch {
    return NextResponse.json({ message: "Corps JSON invalide" }, { status: 400 });
  }

  const to = typeof body.to === "string" ? body.to.trim() : "";
  if (!to || !emailOk(to)) {
    return NextResponse.json({ message: "Adresse e-mail invalide" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await SectionModel.findOne({ slug: slug.trim() }).lean();
    if (!doc) {
      return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
    }

    const designation = doc.designation;
    const apiKey = String(doc.apiKey);
    const secretKey = String(doc.secretKey);

    await sendMail({
      to,
      subject: `Clés API — ${designation}`,
      html: `
        <p>Bonjour,</p>
        <p>Voici les clés d’accès pour la section <strong>${escapeHtml(designation)}</strong> :</p>
        <ul>
          <li><strong>API key</strong> : <code style="word-break:break-all">${escapeHtml(apiKey)}</code></li>
          <li><strong>Secret</strong> : <code style="word-break:break-all">${escapeHtml(secretKey)}</code></li>
        </ul>
        <p>À conserver de manière confidentielle.</p>
      `,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = (error as Error).message;
    if (msg === "mail_host_missing" || msg.startsWith("mail_")) {
      return NextResponse.json(
        { message: "Configuration e-mail manquante sur le serveur" },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { message: "Envoi impossible", error: msg },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
