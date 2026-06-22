import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ParticipantModel } from "@/lib/models/Participant";
import { UserModel } from "@/lib/models/User";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }

    const participants = await ParticipantModel.find({ formation: new Types.ObjectId(id) })
      .populate({ path: "user", model: UserModel, select: "name email matricule" })
      .sort({ createdAt: -1 })
      .lean()
      .exec();

    return NextResponse.json({ data: participants }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list participants", error: (error as Error).message },
      { status: 500 }
    );
  }
}
