import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { parseObjectIdArray } from "@/lib/utils/objectIds";

type RouteContext = { params: Promise<{ id: string; programmeId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    const { id, programmeId } = await context.params;

    await connectDB();
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const pid = new Types.ObjectId(programmeId);
    const prog = await ProgrammeModel.findOne({ _id: pid, section: new Types.ObjectId(id) });
    if (!prog) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }
    const data = await SemestreModel.find({ programme: pid, filiere: { $exists: false } })
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

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id, programmeId } = await context.params;

    await connectDB();
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const pid = new Types.ObjectId(programmeId);
    const prog = await ProgrammeModel.findOne({ _id: pid, section: sid });
    if (!prog) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }

    const payload = await request.json();
    const { designation, credits, description, unites: uniteIds } = payload as {
      designation?: string;
      credits?: number;
      description?: { title: string; contenu: string }[];
      unites?: string[];
    };
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

    const last = await SemestreModel.find({ programme: pid, filiere: { $exists: false } })
      .sort({ order: -1 })
      .limit(1);
    const nextOrder = (last[0]?.order ?? -1) + 1;

    const [created] = await SemestreModel.create([
      {
        designation: designation.trim(),
        credits,
        description: description ?? [],
        unites,
        programme: pid,
        order: nextOrder,
      },
    ]);
    await ProgrammeModel.findByIdAndUpdate(pid, { $addToSet: { semestres: created._id } });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}
