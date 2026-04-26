import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";
import { getSessionPayload, canManageSupportTickets } from "@/lib/auth/sessionServer";
import type { TicketStatus } from "@/lib/models/Ticket";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES: TicketStatus[] = ["pending", "en_cours", "resolu", "ferme"];

/**
 * Détail + CRUD ticket (par id Mongo). Accès agents uniquement.
 */
export async function GET(_request: Request, context: Ctx) {
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

  try {
    await connectDB();
    const doc = await ticketService.getById(id);
    if (!doc) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: ticketService.toAdminDetail(doc) });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Ctx) {
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

  let body: { status?: TicketStatus };
  try {
    body = (await request.json()) as { status?: TicketStatus };
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  if (!body.status || !STATUSES.includes(body.status)) {
    return NextResponse.json({ message: "status invalide" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await ticketService.updateStatus(id, body.status);
    if (!doc) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: ticketService.toAdminDetail(doc) });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: Ctx) {
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

  try {
    await connectDB();
    const ok = await ticketService.delete(id);
    if (!ok) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
