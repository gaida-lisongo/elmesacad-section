import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FormationModel } from "@/lib/models/Formation";
import { ParticipantModel } from "@/lib/models/Participant";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";

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
    const doc = await FormationModel.findById(id).lean();
    if (!doc) {
      return NextResponse.json({ message: "Formation not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch formation", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const payload = await request.json();
    const {
      titre,
      description,
      objectifs,
      questionnaire,
      dateFormation,
      image,
      actif,
      slug: explicitSlug,
    } = payload as {
      titre?: string;
      description?: string;
      objectifs?: string[];
      questionnaire?: { question: string; propositions: string[]; bonneReponse: number; points?: number }[];
      dateFormation?: string;
      image?: string;
      actif?: boolean;
      slug?: string;
    };

    const update: Record<string, unknown> = {};
    if (titre !== undefined) update.titre = titre.trim();
    if (description !== undefined) update.description = description.trim();
    if (objectifs !== undefined) {
      update.objectifs = objectifs.filter((o) => typeof o === "string" && o.trim());
    }
    if (questionnaire !== undefined) {
      update.questionnaire = questionnaire
        .filter((q) => typeof q.question === "string" && q.question.trim())
        .map((q) => ({
          question: q.question.trim(),
          propositions: Array.isArray(q.propositions)
            ? q.propositions.filter((p) => typeof p === "string" && p.trim())
            : [],
          bonneReponse: Number.isFinite(Number(q.bonneReponse)) ? Number(q.bonneReponse) : 0,
          points: Number.isFinite(Number(q.points)) && Number(q.points) > 0 ? Number(q.points) : 2,
        }));
    }
    if (dateFormation !== undefined) {
      if (Number.isNaN(Date.parse(dateFormation))) {
        return NextResponse.json({ message: "La date de formation est invalide" }, { status: 400 });
      }
      update.dateFormation = new Date(dateFormation);
    }
    if (image !== undefined) update.image = image.trim();
    if (actif !== undefined) update.actif = Boolean(actif);
    if (explicitSlug !== undefined) {
      if (!explicitSlug || typeof explicitSlug !== "string") {
        return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
      }
      update.slug = explicitSlug.trim().toLowerCase();
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
    }

    const doc = await FormationModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!doc) {
      return NextResponse.json({ message: "Formation not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      return NextResponse.json({ message: "Slug already in use" }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to update formation", error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
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
    const f = await FormationModel.findById(id);
    if (!f) {
      return NextResponse.json({ message: "Formation not found" }, { status: 404 });
    }
    await ParticipantModel.deleteMany({ formation: new Types.ObjectId(id) });
    await FormationModel.findByIdAndDelete(id);
    return NextResponse.json({ data: { deleted: id } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete formation", error: (error as Error).message },
      { status: 500 }
    );
  }
}
