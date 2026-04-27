import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { parseObjectIdArray } from "@/lib/utils/objectIds";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const data = await SemestreModel.find({
      filiere: new Types.ObjectId(id),
      programme: { $exists: false },
    })
      .sort({ order: 1, createdAt: 1 })
      .populate("unites")
      .lean();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list semestres", error: (error as Error).message },
      { status: 500 }
    );
  }
}

type SemestreCreateItem = {
  designation?: string;
  credits?: number;
  description?: { title: string; contenu: string }[];
  unites?: string[];
};

export async function POST(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const fid = new Types.ObjectId(id);
    const filiere = await FiliereModel.findById(fid);
    if (!filiere) {
      return NextResponse.json({ message: "Filiere not found" }, { status: 404 });
    }

    const payload = (await request.json()) as SemestreCreateItem & { semestres?: SemestreCreateItem[] };

    /** Création groupée : insertMany + mise à jour de la filière en une fois. */
    if (Array.isArray(payload.semestres)) {
      const items = payload.semestres.filter((s) => s?.designation?.trim());
      if (items.length === 0) {
        return NextResponse.json({ data: [] }, { status: 201 });
      }
      for (const s of items) {
        const uniteIds = s.unites;
        if (uniteIds?.length) {
          const unites = parseObjectIdArray(uniteIds);
          const c = await UniteEnseignementModel.countDocuments({ _id: { $in: unites } });
          if (c !== unites.length) {
            return NextResponse.json({ message: "One or more unites are invalid" }, { status: 400 });
          }
        }
      }

      const last = await SemestreModel.find({ filiere: fid, programme: { $exists: false } })
        .sort({ order: -1 })
        .limit(1);
      let nextOrder = (last[0]?.order ?? -1) + 1;

      const docs = items.map((s) => {
        const unites = parseObjectIdArray(s.unites ?? []);
        const doc: Record<string, unknown> = {
          designation: String(s.designation).trim(),
          description: Array.isArray(s.description) ? s.description : [],
          unites,
          filiere: fid,
          order: nextOrder++,
        };
        if (s.credits !== undefined && Number.isFinite(s.credits) && s.credits >= 0) {
          doc.credits = s.credits;
        }
        return doc;
      });

      const created = await SemestreModel.insertMany(docs);
      const ids = created.map((d) => d._id);
      await FiliereModel.findByIdAndUpdate(fid, { $push: { semestres: { $each: ids } } });

      return NextResponse.json({ data: created }, { status: 201 });
    }

    const { designation, credits, description, unites: uniteIds } = payload;
    if (!designation?.trim()) {
      return NextResponse.json({ message: "designation is required" }, { status: 400 });
    }
    const unites = parseObjectIdArray(uniteIds);
    if (unites.length) {
      const c = await UniteEnseignementModel.countDocuments({ _id: { $in: unites } });
      if (c !== unites.length) {
        return NextResponse.json({ message: "One or more unites are invalid" }, { status: 400 });
      }
    }

    const last = await SemestreModel.find({ filiere: fid, programme: { $exists: false } })
      .sort({ order: -1 })
      .limit(1);
    const nextOrder = (last[0]?.order ?? -1) + 1;

    const [created] = await SemestreModel.create([
      {
        designation: designation.trim(),
        credits,
        description: description ?? [],
        unites,
        filiere: fid,
        order: nextOrder,
      },
    ]);
    await FiliereModel.findByIdAndUpdate(fid, { $addToSet: { semestres: created._id } });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}
