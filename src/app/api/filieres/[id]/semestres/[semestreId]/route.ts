import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { parseObjectIdArray } from "@/lib/utils/objectIds";

type RouteContext = { params: Promise<{ id: string; semestreId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id, semestreId } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(semestreId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const doc = await SemestreModel.findOne({
      _id: new Types.ObjectId(semestreId),
      filiere: new Types.ObjectId(id),
      programme: { $exists: false },
    })
      .populate("unites")
      .lean();
    if (!doc) {
      return NextResponse.json({ message: "Semestre not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id, semestreId } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(semestreId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const fid = new Types.ObjectId(id);
    const sid = new Types.ObjectId(semestreId);
    const s = await SemestreModel.findOne({
      _id: sid,
      filiere: fid,
      programme: { $exists: false },
    });
    if (!s) {
      return NextResponse.json({ message: "Semestre not found" }, { status: 404 });
    }

    const payload = await request.json();
    const { designation, credits, description, unites, order } = payload as {
      designation?: string;
      credits?: number;
      description?: { title: string; contenu: string }[];
      unites?: string[];
      order?: number;
    };

    if (unites !== undefined) {
      const u = parseObjectIdArray(unites);
      if (u.length) {
        const c = await UniteEnseignementModel.countDocuments({ _id: { $in: u } });
        if (c !== u.length) {
          return NextResponse.json({ message: "One or more unites are invalid" }, { status: 400 });
        }
      }
      s.unites = u;
    }
    if (designation !== undefined) s.designation = designation;
    if (credits !== undefined) s.credits = credits;
    if (description !== undefined) s.description = description;
    if (order !== undefined) s.order = order;
    await s.save();

    return NextResponse.json({ data: s }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id, semestreId } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(semestreId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const fid = new Types.ObjectId(id);
    const sid = new Types.ObjectId(semestreId);
    const del = await SemestreModel.findOneAndDelete({
      _id: sid,
      filiere: fid,
      programme: { $exists: false },
    });
    if (!del) {
      return NextResponse.json({ message: "Semestre not found" }, { status: 404 });
    }
    await FiliereModel.findByIdAndUpdate(fid, { $pull: { semestres: sid } });
    return NextResponse.json({ data: { deleted: semestreId } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}
