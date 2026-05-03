import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import "@/lib/models/Semestre";
import "@/lib/models/UniteEnseignement";
import "@/lib/models/Matiere";
import { buildNotesMappingRowsFromPopulatedProgramme } from "@/lib/notes/buildNotesMappingRows";

type RouteContext = { params: Promise<{ id: string; programmeId: string }> };

export async function GET(_: Request, context: RouteContext) {
  const { id, programmeId } = await context.params;
  if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(programmeId)) {
    return NextResponse.json({ message: "Invalid id" }, { status: 400 });
  }

  try {
    await connectDB();
    const sid = new Types.ObjectId(id);
    const pid = new Types.ObjectId(programmeId);
    const programme = await ProgrammeModel.findOne({ _id: pid, section: sid })
      .select("_id designation slug credits semestres")
      .populate({
        path: "semestres",
        model: "Semestre",
        populate: {
          path: "unites",
          model: "UniteEnseignement",
          populate: {
            path: "matieres",
            model: "Matiere",
            select: "_id designation credits code",
          },
        },
      })
      .lean();

    if (!programme) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }

    const prog = programme as Record<string, unknown>;
    const rows = buildNotesMappingRowsFromPopulatedProgramme(prog);

    return NextResponse.json(
      {
        data: {
          programme: {
            id: String((programme as { _id?: unknown })._id ?? ""),
            designation: String((programme as { designation?: unknown }).designation ?? ""),
            slug: String((programme as { slug?: unknown }).slug ?? ""),
            credits: Number((programme as { credits?: unknown }).credits ?? 0),
          },
          rows,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to build notes mapping", error: (error as Error).message },
      { status: 500 }
    );
  }
}

