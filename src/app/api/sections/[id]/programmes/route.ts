import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const section = await SectionModel.findById(sid);
    if (!section) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }
    const data = await ProgrammeModel.find({ section: sid })
    .populate("semestres")
    .populate([
      { path: "semestres", model: "Semestre", populate: { path: "filiere", model: "Filiere" } },
      { path: "semestres", model: "Semestre", populate: { path: "unites", model: "UniteEnseignement", populate: { path: "matieres", model: "Matiere" } } },
    ])
    .sort({ createdAt: 1 })
    .lean();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list programmes", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    await connectDB();
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const sid = new Types.ObjectId(id);
    const section = await SectionModel.findById(sid);
    if (!section) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }

    const payload = await request.json();
    const { designation, credits, description } = payload as {
      designation?: string;
      credits?: number;
      description?: { title: string; contenu: string }[];
    };
    if (designation == null || credits == null) {
      return NextResponse.json(
        { message: "designation and credits are required" },
        { status: 400 }
      );
    }

    const slug = await buildUniqueSlug(ProgrammeModel, designation, { section: sid });
    const [created] = await ProgrammeModel.create([
      {
        section: sid,
        designation: designation.trim(),
        credits,
        description: description ?? [],
        slug,
        semestres: [],
      },
    ]);
    await SectionModel.findByIdAndUpdate(sid, { $addToSet: { programmes: created._id } });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      return NextResponse.json({ message: "Slug already used for this section" }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to create programme", error: err.message },
      { status: 500 }
    );
  }
}
