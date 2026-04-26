/**
 * Webhook sortant optionnel : après chaque nouveau message, POST sur TICKET_OUTBOUND_WEBHOOK_URL.
 */
export async function notifyTicketOutbound(payload: {
  event: "ticket.created" | "message.added";
  reference: string;
  ticketId: string;
  fromClient: boolean;
  message?: string;
  createdAt?: string;
}): Promise<void> {
  const url = process.env.TICKET_OUTBOUND_WEBHOOK_URL?.trim();
  if (!url) return;
  const secret = process.env.TICKET_WEBHOOK_SECRET?.trim();
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(secret ? { "X-Webhook-Secret": secret } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("[ticket webhook] outbound failed:", e);
  }
}
