import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";

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
    const data = await SemestreModel.find({ programme: pid })
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
    const { semestreId } = await request.json();
    if (!Types.ObjectId.isValid(semestreId)) {
      return NextResponse.json({ message: "Invalid semestreId" }, { status: 400 });
    }

    await connectDB();
    if (!Types.ObjectId.isValid(semestreId) || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const pid = new Types.ObjectId(programmeId);
    const sid = new Types.ObjectId(semestreId);
    const prog = await ProgrammeModel.findOne({ _id: pid });
    if (!prog) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }

    prog.semestres.push(sid);
    await prog.save();

    return NextResponse.json({ data: prog.semestres }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create semestre", error: (error as Error).message },
      { status: 500 }
    );
  }
}
