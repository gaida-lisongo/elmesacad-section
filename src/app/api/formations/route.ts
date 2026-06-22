import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FormationModel } from "@/lib/models/Formation";
import { ParticipantModel } from "@/lib/models/Participant";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";

export async function GET(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const search = (searchParams.get("search") ?? "").trim();
    const actifParam = searchParams.get("actif");

    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

    const filter: Record<string, unknown> = {};
    if (actifParam === "true") filter.actif = true;
    else if (actifParam === "false") filter.actif = false;

    if (search.length > 0) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { titre: { $regex: escaped, $options: "i" } },
        { slug: { $regex: escaped, $options: "i" } },
        { description: { $regex: escaped, $options: "i" } },
      ];
    }

    const [data, total] = await Promise.all([
      FormationModel.find(filter).sort({ createdAt: -1 }).skip(safeOffset).limit(safeLimit).lean().exec(),
      FormationModel.countDocuments(filter),
    ]);

    return NextResponse.json(
      { data, pagination: { offset: safeOffset, limit: safeLimit, total } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list formations", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const payload = await request.json();
    const {
      titre,
      description,
      objectifs,
      questionnaire,
      dateFormation,
      image,
      actif,
    } = payload as {
      titre?: string;
      description?: string;
      objectifs?: string[];
      questionnaire?: { question: string; propositions: string[]; bonneReponse: number; points?: number }[];
      dateFormation?: string;
      image?: string;
      actif?: boolean;
    };

    if (!titre?.trim()) {
      return NextResponse.json({ message: "Le titre est requis" }, { status: 400 });
    }
    if (!image?.trim()) {
      return NextResponse.json({ message: "L'image est requise (upload avant envoi)" }, { status: 400 });
    }
    if (!dateFormation || Number.isNaN(Date.parse(dateFormation))) {
      return NextResponse.json({ message: "La date de formation est invalide" }, { status: 400 });
    }

    const slug = await buildUniqueSlug(FormationModel, titre, {});

    const created = await FormationModel.create({
      titre: titre.trim(),
      slug,
      description: description?.trim() || "",
      objectifs: Array.isArray(objectifs) ? objectifs.filter((o) => typeof o === "string" && o.trim()) : [],
      questionnaire: Array.isArray(questionnaire)
        ? questionnaire
            .filter((q) => typeof q.question === "string" && q.question.trim())
            .map((q) => ({
              question: q.question.trim(),
              propositions: Array.isArray(q.propositions)
                ? q.propositions.filter((p) => typeof p === "string" && p.trim())
                : [],
              bonneReponse: Number.isFinite(Number(q.bonneReponse)) ? Number(q.bonneReponse) : 0,
              points: Number.isFinite(Number(q.points)) && Number(q.points) > 0 ? Number(q.points) : 2,
            }))
        : [],
      dateFormation: new Date(dateFormation),
      image: image.trim(),
      actif: typeof actif === "boolean" ? actif : true,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create formation", error: (error as Error).message },
      { status: 500 }
    );
  }
}
