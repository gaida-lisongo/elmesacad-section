import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";

type Ctx = { params: Promise<{ reference: string }> };

/**
 * Détail public d’un ticket (par référence) — sans e-mail / téléphone.
 */
export async function GET(_request: Request, context: Ctx) {
  const { reference } = await context.params;
  const ref = decodeURIComponent(reference).trim();

  try {
    await connectDB();
    const doc = await ticketService.getByReference(ref);
    if (!doc) {
      return NextResponse.json({ message: "Ticket introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: ticketService.toPublicJson(doc) });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
