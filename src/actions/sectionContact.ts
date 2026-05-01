"use server";

import { sendMail } from "@/lib/mail/Mail";
import { uploadStudentFile } from "@/lib/file/uploadStudentFile";

export type SectionContactActionResult = {
  ok: boolean;
  message: string;
  attachmentUrl?: string;
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function submitSectionContactAction(
  formData: FormData
): Promise<SectionContactActionResult> {
  try {
    const toEmail = String(formData.get("toEmail") ?? "").trim();
    const toName = String(formData.get("toName") ?? "").trim();
    const sectionName = String(formData.get("sectionName") ?? "").trim();
    const senderName = String(formData.get("senderName") ?? "").trim();
    const senderEmail = String(formData.get("senderEmail") ?? "").trim();
    const senderPhone = String(formData.get("senderPhone") ?? "").trim();
    const subject = String(formData.get("subject") ?? "").trim();
    const message = String(formData.get("message") ?? "").trim();
    const file = formData.get("attachment");

    if (!toEmail || !senderName || !senderEmail || !subject || !message) {
      return { ok: false, message: "Veuillez remplir tous les champs obligatoires." };
    }

    const attachmentFile = file instanceof File && file.size > 0 ? file : null;
    let attachmentUrl: string | undefined;
    if (attachmentFile) {
      const uploaded = await uploadStudentFile({
        file: attachmentFile,
        filename: attachmentFile.name,
        schema: "section/contacts",
      });
      attachmentUrl = uploaded.publicUrl;
    }

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:24px;color:#111827;">
        <div style="max-width:760px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:14px;padding:24px;">
          <h1 style="margin:0 0 12px;font-size:22px;color:#111827;">Nouveau message de contact section</h1>
          <p style="margin:0 0 16px;color:#334155;">
            <strong>Section:</strong> ${esc(sectionName || "Section")}<br/>
            <strong>Destinataire:</strong> ${esc(toName || toEmail)}
          </p>
          <div style="margin:0 0 16px;padding:14px;border:1px solid #e5e7eb;border-radius:10px;background:#fafafa;">
            <p style="margin:0 0 8px;"><strong>Correspondant:</strong> ${esc(senderName)}</p>
            <p style="margin:0 0 8px;"><strong>Email:</strong> ${esc(senderEmail)}</p>
            <p style="margin:0;"><strong>Contact:</strong> ${esc(senderPhone || "N/A")}</p>
          </div>
          <p style="margin:0 0 8px;"><strong>Objet:</strong> ${esc(subject)}</p>
          <p style="margin:0 0 8px;"><strong>Message:</strong></p>
          <div style="white-space:pre-wrap;line-height:1.6;border-left:3px solid #dbeafe;padding-left:12px;">
            ${esc(message)}
          </div>
          ${
            attachmentUrl
              ? `<p style="margin:16px 0 0;"><strong>Piece jointe:</strong> <a href="${esc(attachmentUrl)}" target="_blank" rel="noreferrer">Voir le fichier</a></p>`
              : ""
          }
        </div>
      </div>
    `;

    await sendMail({
      to: toEmail,
      subject: `[Contact ${sectionName || "Section"}] ${subject}`,
      html,
    });

    return { ok: true, message: "Votre message a ete envoye.", attachmentUrl };
  } catch (error) {
    return { ok: false, message: (error as Error).message || "Echec envoi du message." };
  }
}
