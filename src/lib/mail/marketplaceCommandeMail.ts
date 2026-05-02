import { sendMail } from "@/lib/mail/Mail";

function publicAppOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const v = process.env.VERCEL_URL?.trim();
  if (v) return `https://${v.replace(/\/+$/, "")}`;
  return "";
}

export async function sendMarketplaceCommandePendingMail(input: {
  to: string;
  studentName?: string;
  commandeId: string;
  productLabel: string;
}): Promise<void> {
  const origin = publicAppOrigin();
  const payPath = `/paiement?commandeId=${encodeURIComponent(input.commandeId)}`;
  const link = origin ? `${origin}${payPath}` : payPath;
  const greet = input.studentName?.trim() ? `Bonjour ${input.studentName.trim()},` : "Bonjour,";

  await sendMail({
    to: input.to,
    subject: `INBTP — Finalisez votre commande : ${input.productLabel.slice(0, 60)}`,
    html: `
      <div style="font-family:Arial,sans-serif;background:#f5f7fb;padding:24px;color:#1f2937;">
        <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;border:1px solid #e5e7eb;padding:28px;">
          <p style="margin:0 0 12px;">${greet}</p>
          <p style="margin:0 0 12px;">Votre commande pour <strong>${escapeHtml(input.productLabel)}</strong> a été enregistrée.</p>
          <p style="margin:0 0 12px;">Finalisez le <strong>paiement mobile money</strong> depuis le lien ci-dessous (vous pourrez aussi vérifier le statut du paiement) :</p>
          <p style="margin:16px 0;">
            <a href="${link}" style="display:inline-block;background:#FF4D7E;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:bold;">
              Reprendre ma commande
            </a>
          </p>
          <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">Si le bouton ne fonctionne pas, copiez ce lien :<br/>
          <span style="word-break:break-all;">${link}</span></p>
          <p style="margin:16px 0 0;font-size:12px;color:#6b7280;">Réf. commande : <code>${escapeHtml(input.commandeId)}</code></p>
        </div>
      </div>
    `,
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
