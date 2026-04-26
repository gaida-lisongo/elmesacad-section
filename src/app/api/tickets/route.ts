import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import ticketService from "@/lib/services/TicketService";
import { getSessionPayload, canManageSupportTickets } from "@/lib/auth/sessionServer";
import { sendTicketAccuseReception } from "@/lib/mail/ticketMails";
import type { TicketCategorie } from "@/lib/models/Ticket";

const CATEGORIES: TicketCategorie[] = ["student", "agent", "visiteur"];

/**
 * POST — création publique (formulaire contact).
 * GET — liste (agents).
 */
export async function POST(request: Request) {
  try {
    await connectDB();
    const body = (await request.json()) as {
      objet?: string;
      categorie?: string;
      message?: string;
      nomComplet?: string;
      email?: string;
      telephone?: string;
    };

    if (!body.objet?.trim() || !body.message?.trim() || !body.nomComplet?.trim()) {
      return NextResponse.json({ message: "Champs obligatoires manquants" }, { status: 400 });
    }
    if (!body.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
      return NextResponse.json({ message: "E-mail invalide" }, { status: 400 });
    }
    if (!body.telephone?.trim()) {
      return NextResponse.json({ message: "Téléphone requis" }, { status: 400 });
    }
    const cat = (body.categorie ?? "visiteur").toLowerCase();
    const categorie = (CATEGORIES.includes(cat as TicketCategorie) ? cat : "visiteur") as TicketCategorie;

    const ticket = await ticketService.create({
      objet: body.objet,
      categorie,
      message: body.message,
      nomComplet: body.nomComplet,
      email: body.email,
      telephone: body.telephone,
    });

    try {
      const publicOrigin = new URL(request.url).origin;
      await sendTicketAccuseReception({
        to: ticket.email,
        nomComplet: ticket.nomComplet,
        reference: ticket.reference,
        objet: ticket.objet,
        publicOrigin,
      });
    } catch (mailErr) {
      console.error("[api/tickets POST] mail accusé:", mailErr);
    }

    return NextResponse.json(
      {
        data: {
          reference: ticket.reference,
          id: String(ticket._id),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canManageSupportTickets(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const page = Math.max(0, Number(searchParams.get("page") ?? "0") || 0);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? "20") || 20));
  const search = searchParams.get("search") ?? "";
  const status = (searchParams.get("status") ?? "all") as "all" | "pending" | "en_cours" | "resolu" | "ferme";

  try {
    await connectDB();
    const { items, total } = await ticketService.listForAgents({
      search,
      status,
      offset: page * limit,
      limit,
    });
    return NextResponse.json({ data: items, total, page, limit });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
