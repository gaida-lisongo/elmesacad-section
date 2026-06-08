"use server";

import { sendMail } from "@/lib/mail/Mail";

export type FactureSendMailResult = { ok: true } | { ok: false; message: string };

export async function factureSendMailAction(
  toEmail: string,
  studentNom: string,
  htmlInvoice: string
): Promise<FactureSendMailResult> {
  try {
    await sendMail({
      to: toEmail,
      subject: `Facture de commande — INBTP`,
      html: htmlInvoice,
    });

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: (error as Error).message || "Échec de l'envoi de la facture.",
    };
  }
}