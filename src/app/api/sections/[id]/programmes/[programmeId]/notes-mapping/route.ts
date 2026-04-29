import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import "@/lib/models/Semestre";
import "@/lib/models/UniteEnseignement";
import "@/lib/models/Matiere";

type RouteContext = { params: Promise<{ id: string; programmeId: string }> };

type MappingRow = {
  key: string;
  matiere: { designation: string; reference: string; credits: number };
  unite: { designation: string; reference: string; code: string; credits: number };
  semestre: { designation: string; reference: string; credits: number };
};

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
      .select("_id designation slug semestres")
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

    const semestres = Array.isArray((programme as { semestres?: unknown[] }).semestres)
      ? (((programme as { semestres?: unknown[] }).semestres as unknown[]) ?? [])
      : [];

    const rowsMap = new Map<string, MappingRow>();
    for (const sem of semestres as Array<Record<string, unknown>>) {
      const semRef = String(sem._id ?? "");
      const semDes = String(sem.designation ?? "");
      const semCredits = Number(sem.credits ?? 0);
      const unites = Array.isArray(sem.unites) ? (sem.unites as Array<Record<string, unknown>>) : [];

      for (const ue of unites) {
        const ueRef = String(ue._id ?? "");
        const ueDes = String(ue.designation ?? "");
        const ueCode = String(ue.code ?? "");
        const ueCredits = Number(ue.credits ?? 0);
        const matieres = Array.isArray(ue.matieres) ? (ue.matieres as Array<Record<string, unknown>>) : [];

        for (const m of matieres) {
          const mRef = String(m._id ?? "");
          const mDes = String(m.designation ?? "").trim();
          if (!mRef || !mDes) continue;
          const key = `${semRef}|${ueRef}|${mRef}`;
          rowsMap.set(key, {
            key,
            matiere: {
              designation: mDes,
              reference: mRef,
              credits: Number(m.credits ?? 0),
            },
            unite: {
              designation: ueDes,
              reference: ueRef,
              code: ueCode,
              credits: ueCredits,
            },
            semestre: {
              designation: semDes,
              reference: semRef,
              credits: semCredits,
            },
          });
        }
      }
    }

    return NextResponse.json(
      {
        data: {
          programme: {
            id: String((programme as { _id?: unknown })._id ?? ""),
            designation: String((programme as { designation?: unknown }).designation ?? ""),
            slug: String((programme as { slug?: unknown }).slug ?? ""),
          },
          rows: [...rowsMap.values()],
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

