import { NextResponse } from "next/server";
import { mailService } from "@/lib/mail/Mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeRecipients(to: unknown): string[] | null {
  if (typeof to === "string") {
    const e = to.trim();
    return e && EMAIL_RE.test(e) ? [e] : null;
  }
  if (Array.isArray(to)) {
    const list: string[] = [];
    for (const item of to) {
      if (typeof item !== "string") {
        return null;
      }
      const e = item.trim();
      if (!e || !EMAIL_RE.test(e)) {
        return null;
      }
      list.push(e);
    }
    return list.length > 0 ? list : null;
  }
  return null;
}

type AttachmentBody = {
  name?: string;
  contentBytes?: string;
  contentType?: string;
};

/**
 * POST — envoi d'e-mail pour services externes.
 * Dev: ouvert sans auth ; à sécuriser avec le reste de l'application en production.
 *
 * Corps JSON:
 * - to: string | string[] (obligatoire)
 * - subject: string (obligatoire)
 * - html: string (corps HTML ; obligatoire si text absent)
 * - text: string (corps texte brut ; ignoré si html fourni)
 * - from: string (expéditeur optionnel, sinon MAIL_FROM)
 * - attachments: { name, contentBytes (base64), contentType }[]
 */
export async function POST(request: Request) {
  let body: {
    to?: unknown;
    subject?: string;
    html?: string;
    text?: string;
    from?: string;
    attachments?: AttachmentBody[];
  };

  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON invalide" }, { status: 400 });
  }

  const recipients = normalizeRecipients(body.to);
  if (!recipients) {
    return NextResponse.json(
      { ok: false, error: "to doit être un e-mail valide ou un tableau d'e-mails valides" },
      { status: 400 }
    );
  }

  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  if (!subject) {
    return NextResponse.json({ ok: false, error: "subject est requis" }, { status: 400 });
  }

  let html = typeof body.html === "string" ? body.html.trim() : "";
  if (!html) {
    const text = typeof body.text === "string" ? body.text : "";
    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "html ou text est requis pour le corps du message" },
        { status: 400 }
      );
    }
    html = `<pre style="font-family:system-ui,sans-serif;white-space:pre-wrap;">${escapeHtml(text)}</pre>`;
  }

  let attachments:
    | { name: string; contentBytes: string; contentType: string }[]
    | undefined;

  if (body.attachments !== undefined) {
    if (!Array.isArray(body.attachments)) {
      return NextResponse.json({ ok: false, error: "attachments doit être un tableau" }, { status: 400 });
    }
    attachments = [];
    const maxBytes = 15 * 1024 * 1024;
    let total = 0;
    for (const a of body.attachments) {
      const name = typeof a.name === "string" ? a.name.trim() : "";
      const contentBytes = typeof a.contentBytes === "string" ? a.contentBytes.trim() : "";
      const contentType =
        typeof a.contentType === "string" && a.contentType.trim()
          ? a.contentType.trim()
          : "application/octet-stream";
      if (!name || !contentBytes) {
        return NextResponse.json(
          { ok: false, error: "Chaque pièce jointe doit avoir name et contentBytes (base64)" },
          { status: 400 }
        );
      }
      let buf: Buffer;
      try {
        buf = Buffer.from(contentBytes, "base64");
      } catch {
        return NextResponse.json(
          { ok: false, error: `contentBytes invalide (base64) pour ${name}` },
          { status: 400 }
        );
      }
      if (buf.length === 0 && contentBytes.length > 0) {
        return NextResponse.json(
          { ok: false, error: `contentBytes base64 invalide pour ${name}` },
          { status: 400 }
        );
      }
      total += buf.length;
      if (total > maxBytes) {
        return NextResponse.json(
          { ok: false, error: "Taille totale des pièces jointes dépassée (max. 15 Mo)" },
          { status: 400 }
        );
      }
      attachments.push({ name, contentBytes, contentType });
    }
  }

  const from =
    typeof body.from === "string" && body.from.trim().length > 0
      ? body.from.trim().slice(0, 512)
      : undefined;

  try {
    const info = await mailService.send({
      to: recipients,
      subject,
      html,
      ...(from ? { from } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });

    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur envoi mail";
    console.error("[api/mail/send]", e);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
