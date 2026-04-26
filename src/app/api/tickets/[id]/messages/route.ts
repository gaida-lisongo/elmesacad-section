import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";
import { getSessionPayload, canManageSupportTickets } from "@/lib/auth/sessionServer";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Ajout d’un message côté support (author: false).
 */
export async function POST(request: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canManageSupportTickets(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "id invalide" }, { status: 400 });
  }

  let body: { message?: string; assets?: string[] };
  try {
    body = (await request.json()) as { message?: string; assets?: string[] };
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  if (!body.message || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ message: "message requis" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await ticketService.addMessageByAgent(id, {
      message: body.message,
      assets: Array.isArray(body.assets) ? body.assets : [],
    });
    if (!doc) {
      return NextResponse.json({ message: "Ticket introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: ticketService.toAdminDetail(doc) });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
