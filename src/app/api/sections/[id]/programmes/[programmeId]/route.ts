import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { MatiereModel } from "@/lib/models/Matiere";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { SectionModel } from "@/lib/models/Section";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";
import "@/lib/models/Semestre";
import "@/lib/models/Filiere";
import "@/lib/models/Matiere";

type RouteContext = { params: Promise<{ id: string; programmeId: string }> };

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
    .populate("semestres")
    .populate([
      { path: "semestres", model: "Semestre", populate: { path: "filiere", model: "Filiere" } },
      { path: "semestres", model: "Semestre", populate: { path: "unites", model: "UniteEnseignement", populate: { path: "matieres", model: "Matiere" } } },
    ])
    .lean();
    if (!programme) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }

    return NextResponse.json({ data: programme }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch programme", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { id, programmeId } = await context.params;

    await connectDB();
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const p = await ProgrammeModel.findOne({ _id: new Types.ObjectId(programmeId), section: sid });
    if (!p) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }
    const payload = await request.json();
    const { designation, credits, description, slug: newSlug, regenerateSlug } = payload as {
      designation?: string;
      credits?: number;
      description?: { title: string; contenu: string }[];
      slug?: string;
      regenerateSlug?: boolean;
    };
    if (designation !== undefined) p.designation = designation;
    if (credits !== undefined) p.credits = credits;
    if (description !== undefined) p.description = description;
    if (newSlug !== undefined) p.slug = String(newSlug).trim().toLowerCase();
    if (regenerateSlug === true) {
      p.slug = await buildUniqueSlug(ProgrammeModel, p.designation, { section: sid }, p._id);
    }
    try {
      await p.save();
    } catch (e) {
      const err = e as { code?: number; message: string };
      if (err.code === 11000) {
        return NextResponse.json({ message: "Slug already used for this section" }, { status: 409 });
      }
      throw e;
    }
    return NextResponse.json({ data: p }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update programme", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const { id, programmeId } = await context.params;

    await connectDB();
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(programmeId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const pid = new Types.ObjectId(programmeId);
    const p = await ProgrammeModel.findOneAndDelete({ _id: pid, section: sid });
    if (!p) {
      return NextResponse.json({ message: "Programme not found" }, { status: 404 });
    }
    await SemestreModel.deleteMany({ programme: pid });
    await SectionModel.findByIdAndUpdate(sid, { $pull: { programmes: pid } });
    return NextResponse.json({ data: { deleted: programmeId } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete programme", error: (error as Error).message },
      { status: 500 }
    );
  }
}
