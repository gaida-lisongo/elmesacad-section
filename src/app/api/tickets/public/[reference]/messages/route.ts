import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";

type Ctx = { params: Promise<{ reference: string }> };

/**
 * Nouveau message du requérant (author: true). L’e-mail doit correspondre au ticket.
 */
export async function POST(request: Request, context: Ctx) {
  const { reference } = await context.params;
  const ref = decodeURIComponent(reference).trim();

  let body: { email?: string; message?: string; assets?: string[] };
  try {
    body = (await request.json()) as { email?: string; message?: string; assets?: string[] };
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }
  if (!body.email?.trim() || !body.message?.trim()) {
    return NextResponse.json({ message: "email et message requis" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await ticketService.addMessageByReference(ref, {
      email: body.email,
      message: body.message,
      assets: Array.isArray(body.assets) ? body.assets : [],
    });
    if (!doc) {
      return NextResponse.json(
        { message: "Ticket introuvable ou e-mail ne correspond pas" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: ticketService.toPublicJson(doc) });
  } catch (e) {
    const msg = (e as Error).message;
    if (msg.includes("clos")) {
      return NextResponse.json({ message: msg }, { status: 400 });
    }
    return NextResponse.json({ message: msg }, { status: 500 });
  }
}
