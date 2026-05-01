import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import "@/lib/models/Semestre";
import "@/lib/models/UniteEnseignement";
import "@/lib/models/Matiere";

export type ProgrammeMatiereFlatRow = {
  id: string;
  /** Référence envoyée au service étudiant : toujours l’`_id` Mongo de la matière. */
  reference: string;
  /** Code métier (affichage seulement). */
  code?: string;
  designation: string;
  credits: number;
};

type RouteContext = { params: Promise<{ id: string; programmeId: string }> };

/**
 * Liste aplatie des matières d'un programme (semestres → unités → matières).
 * GET /api/sections/:sectionId/programmes/:programmeId/matieres-flat
 */
export async function GET(_: Request, context: RouteContext) {
  try {
    const { id, programmeId } = await context.params;
    await connectDB();
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const pid = new Types.ObjectId(programmeId);
    const sid = new Types.ObjectId(id);
    const programme = await ProgrammeModel.findOne({ _id: pid, section: sid })
      .populate([
        {
          path: "semestres",
          model: "Semestre",
          populate: {
            path: "unites",
            model: "UniteEnseignement",
            populate: { path: "matieres", model: "Matiere" },
          },
        },
      ])
      .lean();

    if (!programme) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }

    const semestres = Array.isArray((programme as { semestres?: unknown }).semestres)
      ? (programme as { semestres: unknown[] }).semestres
      : [];

    const flat: ProgrammeMatiereFlatRow[] = [];

    for (const sem of semestres) {
      const s = sem && typeof sem === "object" ? (sem as Record<string, unknown>) : {};
      const unites = Array.isArray(s.unites) ? s.unites : [];
      for (const ue of unites) {
        const u = ue && typeof ue === "object" ? (ue as Record<string, unknown>) : {};
        const matieres = Array.isArray(u.matieres) ? u.matieres : [];
        for (const raw of matieres) {
          const m = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
          const mid = String(m._id ?? "").trim();
          if (!mid) continue;
          const code = String(m.code ?? "").trim();
          const designation = String(m.designation ?? "").trim();
          const credRaw = m.credits;
          const credits =
            typeof credRaw === "number" && Number.isFinite(credRaw)
              ? Math.max(0, credRaw)
              : Math.max(0, Number(credRaw) || 0);
          flat.push({
            id: mid,
            reference: mid,
            ...(code ? { code } : {}),
            designation,
            credits,
          });
        }
      }
    }

    const seen = new Set<string>();
    const matieres = flat.filter((row) => {
      if (seen.has(row.reference)) return false;
      seen.add(row.reference);
      return true;
    });

    return NextResponse.json({ data: { matieres } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list matieres", error: (error as Error).message },
      { status: 500 }
    );
  }
}
