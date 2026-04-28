import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { parseObjectIdArray } from "@/lib/utils/objectIds";

type RouteContext = { params: Promise<{ id: string; programmeId: string; semestreId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id, programmeId, semestreId } = await context.params;

    await connectDB();
    if (![id, programmeId, semestreId].every((x) => Types.ObjectId.isValid(x))) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const pid = new Types.ObjectId(programmeId);
    const p = await ProgrammeModel.findOne({ _id: pid, section: sid });
    if (!p) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }
    const doc = await SemestreModel.findOne({
      _id: new Types.ObjectId(semestreId),
      programme: pid,
      filiere: { $exists: false },
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
    const { id, programmeId, semestreId } = await context.params;

    await connectDB();
    if (![id, programmeId, semestreId].every((x) => Types.ObjectId.isValid(x))) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const pid = new Types.ObjectId(programmeId);
    const sem = new Types.ObjectId(semestreId);
    const prog = await ProgrammeModel.findOne({ _id: pid, section: sid });
    if (!prog) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }
    const s = await SemestreModel.findOne({ _id: sem, programme: pid, filiere: { $exists: false } });
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
    return NextResponse.json(
      {
        data: s,
        affectation: {
          programmeId: String(pid),
          semestreId: String(sem),
          uniteIds: s.unites.map((u) => String(u)),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id, programmeId, semestreId } = await context.params;

    await connectDB();
    if (![id, programmeId, semestreId].every((x) => Types.ObjectId.isValid(x))) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const pid = new Types.ObjectId(programmeId);
    const sem = new Types.ObjectId(semestreId);
    const prog = await ProgrammeModel.findOne({ _id: pid, section: sid });
    if (!prog) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }
    const del = await SemestreModel.findOneAndDelete({
      _id: sem,
      programme: pid,
      filiere: { $exists: false },
    });
    if (!del) {
      return NextResponse.json({ message: "Semestre not found" }, { status: 404 });
    }
    await ProgrammeModel.findByIdAndUpdate(pid, { $pull: { semestres: sem } });
    return NextResponse.json({ data: { deleted: semestreId } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}
