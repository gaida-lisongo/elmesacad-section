import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";
import { Types } from "mongoose";

/**
 * Webhook entrant (intégrations) : même contrat que le webhook sortant optionnel.
 * POST { event, ticketId, ... } avec en-tête X-Webhook-Secret = TICKET_WEBHOOK_SECRET.
 * Peut servir à déclencher une resynchro côté client ou outil externe.
 */
export async function POST(request: Request) {
  const secret = process.env.TICKET_WEBHOOK_SECRET?.trim();
  const header = request.headers.get("x-webhook-secret");
  if (secret && header !== secret) {
    return NextResponse.json({ message: "Non autorisé" }, { status: 401 });
  }

  let body: { event?: string; ticketId?: string };
  try {
    body = (await request.json()) as { event?: string; ticketId?: string };
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  if (!body.ticketId || !Types.ObjectId.isValid(body.ticketId)) {
    return NextResponse.json({ message: "ticketId invalide" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await ticketService.getById(body.ticketId);
    if (!doc) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      data: ticketService.toAdminDetail(doc),
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
