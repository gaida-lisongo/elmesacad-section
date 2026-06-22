import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FormationModel } from "@/lib/models/Formation";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const { slug } = await context.params;
    if (!slug?.trim()) {
      return NextResponse.json({ message: "Slug manquant" }, { status: 400 });
    }
    const doc = await FormationModel.findOne({ slug: slug.trim() }).lean();
    if (!doc) {
      return NextResponse.json({ message: "Formation introuvable" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Échec chargement", error: (error as Error).message },
      { status: 500 }
    );
  }
}
