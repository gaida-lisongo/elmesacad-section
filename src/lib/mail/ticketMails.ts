import { sendMail } from "@/lib/mail/Mail";
import { buildTicketChatUrl } from "@/lib/ticket/buildTicketPublicUrl";

const BRAND = "Endeavor";
const primary = "#058AC5";
const secondary = "#E76067";
const text = "#263238";
const muted = "#6b7280";
const border = "#e5e7eb";
const cardBg = "#f9fafb";

function emailLayout(inner: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width" />
  <title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f3f4f6;padding:24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.06);">
          <tr>
            <td style="padding:24px 28px 8px 28px;background:linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);">
              <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${BRAND}</p>
              <p style="margin:8px 0 0 0;font-size:13px;color:rgba(255,255,255,0.9);">Support</p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px 28px;">
              ${inner}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 28px;background-color:${cardBg};border-top:1px solid ${border};">
              <p style="margin:0;font-size:11px;color:${muted};line-height:1.5;">Cet e-mail a été envoyé automatiquement. En cas de question, répondez via le lien de conversation.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendTicketAccuseReception(params: {
  to: string;
  nomComplet: string;
  reference: string;
  objet: string;
  /** Ex. new URL(request.url).origin (route POST /api/tickets) pour un lien cliquable complet */
  publicOrigin?: string | null;
}): Promise<void> {
  const fullUrl = buildTicketChatUrl(params.reference, params.publicOrigin);
  const subject = `Accusé de réception — ${params.objet} [${params.reference}]`;
  const inner = `
    <p style="margin:24px 0 12px 0;font-size:16px;color:${text};line-height:1.5;">Bonjour <strong>${escapeHtml(
      params.nomComplet
    )}</strong>,</p>
    <p style="margin:0 0 12px 0;font-size:14px;color:${text};line-height:1.6;">Nous avons bien reçu votre demande. Elle est enregistrée sous la référence ci-dessous.</p>
    <table role="presentation" width="100%" style="background:${cardBg};border-radius:8px;border:1px solid ${border};margin:16px 0;padding:0;">
      <tr>
        <td style="padding:16px 18px;">
          <p style="margin:0 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${muted};">Référence</p>
          <p style="margin:0;font-family:ui-monospace,monospace;font-size:15px;font-weight:600;color:${text};">${escapeHtml(
            params.reference
          )}</p>
          <p style="margin:12px 0 4px 0;font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:${muted};">Objet</p>
          <p style="margin:0;font-size:14px;color:${text};">${escapeHtml(params.objet)}</p>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 20px 0;font-size:14px;color:${text};line-height:1.6;">Pour suivre l’échange et échanger avec notre équipe, ouvrez votre espace de conversation :</p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${escapeAttr(fullUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);color:#ffffff !important;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;box-shadow:0 2px 12px rgba(44,221,155,0.35);">Ouvrir la conversation</a>
    </div>
    <p style="margin:0 0 8px 0;font-size:12px;color:${muted};line-height:1.5;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :</p>
    <p style="margin:0 0 20px 0;padding:12px 14px;background:#f3f4f6;border-radius:8px;font-size:12px;word-break:break-all;color:#374151;">${escapeHtml(
      fullUrl
    )}</p>
  `;
  const html = emailLayout(inner);
  try {
    await sendMail({ to: params.to, subject, html });
  } catch (e) {
    console.error("[ticket mail] accusé de réception impossible:", e);
    throw e;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

export async function sendTicketClientNotifyNewReply(params: {
  to: string;
  reference: string;
  publicOrigin?: string | null;
}): Promise<void> {
  const fullUrl = buildTicketChatUrl(params.reference, params.publicOrigin);
  const subject = `Nouveau message sur votre ticket [${params.reference}]`;
  const inner = `
    <p style="margin:24px 0 12px 0;font-size:16px;color:${text};line-height:1.5;">Vous avez reçu une réponse du support.</p>
    <p style="margin:0 0 20px 0;font-size:14px;color:${text};line-height:1.6;">Référence : <strong style="font-family:ui-monospace,monospace;">${escapeHtml(
      params.reference
    )}</strong></p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${escapeAttr(fullUrl)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:14px 28px;background:linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);color:#ffffff !important;font-size:15px;font-weight:600;text-decoration:none;border-radius:10px;">Lire le message</a>
    </div>
    <p style="margin:0;font-size:12px;word-break:break-all;color:#6b7280;">${escapeHtml(fullUrl)}</p>
  `;
  const html = emailLayout(inner);
  try {
    await sendMail({ to: params.to, subject, html });
  } catch (e) {
    console.error("[ticket mail] notification client:", e);
  }
}
