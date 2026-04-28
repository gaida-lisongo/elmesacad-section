import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { SemestreModel } from "@/lib/models/Semestre";

type RouteContext = { params: Promise<{ id: string }> };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const MAX_FILIERES = 20;

/**
 * Semestres des filières dont le slug ou la désignation correspond à la recherche (préremplissage programme de section).
 */
export async function GET(request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Identifiant de section invalide" }, { status: 400 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("search") ?? "").trim();
  const limitRaw = searchParams.get("limit");
  const limit = Math.min(36, Math.max(1, Number(limitRaw) || 12));

  if (q.length < 2) {
    return NextResponse.json({ data: [] }, { status: 200 });
  }

  try {
    await connectDB();
    const re = new RegExp(escapeRegex(q), "i");

    const filieres = await FiliereModel.find({
      $or: [{ designation: re }, { slug: re }],
    })
      .select("_id designation slug")
      .sort({ designation: 1 })
      .limit(MAX_FILIERES)
      .lean();

    if (!filieres.length) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const meta = new Map<string, { label: string; slug: string }>();
    for (const f of filieres) {
      meta.set(String(f._id), { label: f.designation ?? "", slug: f.slug ?? "" });
    }
    const fids = filieres.map((f) => f._id);

    const semestres = await SemestreModel.find({
      filiere: { $in: fids },
    })
      .select("designation credits description filiere order")
      .sort({ order: 1, designation: 1 })
      .limit(limit)
      .lean();

    const data = semestres.map((s) => {
      const fid = s.filiere != null ? String(s.filiere) : "";
      const m = meta.get(fid) ?? { label: "Filière", slug: "" };
      return {
        id: String(s._id),
        designation: s.designation,
        credits: s.credits,
        description: Array.isArray(s.description) ? s.description : [],
        filiereLabel: m.label,
        filiereSlug: m.slug,
        order: typeof s.order === "number" ? s.order : 0,
      };
    });

    return NextResponse.json({ data }, { status: 200 });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
