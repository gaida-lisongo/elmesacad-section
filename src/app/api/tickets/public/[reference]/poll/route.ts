import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";

type Ctx = { params: Promise<{ reference: string }> };

/**
 * Webhook / polling léger : messages dont createdAt > `since` (ISO).
 */
export async function GET(request: Request, context: Ctx) {
  const { reference } = await context.params;
  const ref = decodeURIComponent(reference).trim();
  const { searchParams } = new URL(request.url);
  const sinceRaw = searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : new Date(0);

  try {
    await connectDB();
    const doc = await ticketService.getByReference(ref);
    if (!doc) {
      return NextResponse.json({ message: "Ticket introuvable" }, { status: 404 });
    }
    const chats = (doc.chats ?? []).filter((c) => {
      const t = c.createdAt ? new Date(c.createdAt) : new Date(0);
      return t > since;
    });
    return NextResponse.json({
      data: {
        reference: doc.reference,
        status: doc.status,
        updatedAt: doc.updatedAt?.toISOString?.() ?? "",
        newMessages: chats.map((c) => ({
          id: String(c._id),
          author: c.author,
          message: c.message,
          assets: c.assets ?? [],
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : "",
        })),
      },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
