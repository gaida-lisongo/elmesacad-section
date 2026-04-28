import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

/**
 * Sections dont l’agent connecté (organisateur) est membre du bureau.
 */
export async function GET() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (session.role !== "organisateur") {
    return NextResponse.json(
      { message: "Cette liste est réservée aux organisateurs." },
      { status: 403 }
    );
  }
  if (!Types.ObjectId.isValid(session.sub)) {
    return NextResponse.json({ message: "Session invalide" }, { status: 400 });
  }
  const oid = new Types.ObjectId(session.sub);

  try {
    await connectDB();
    const data = await SectionModel.find({
      $or: [
        { "bureau.chefSection": oid },
        { "bureau.chargeEnseignement": oid },
        { "bureau.chargeRecherche": oid },
      ],
    })
      .select("_id designation slug cycle")
      .sort({ designation: 1 })
      .lean();

    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
