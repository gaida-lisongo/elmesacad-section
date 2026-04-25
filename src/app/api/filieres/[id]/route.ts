import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { SemestreModel } from "@/lib/models/Semestre";

type RouteContext = { params: Promise<{ id: string }> };

const populateFiliere = {
  path: "semestres",
  model: "Semestre",
  populate: {
    path: "unites",
    model: "UniteEnseignement",
    populate: { path: "matieres", model: "Matiere" },
  },
};

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const doc = await FiliereModel.findById(id).populate(populateFiliere).lean();
    if (!doc) {
      return NextResponse.json({ message: "Filiere not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch filiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const payload = await request.json();
    const { designation, description, slug: explicitSlug } = payload as {
      designation?: string;
      description?: { title: string; contenu: string }[];
      slug?: string;
    };
    const update: Record<string, unknown> = {};
    if (designation !== undefined) update.designation = designation;
    if (description !== undefined) update.description = description;
    if (explicitSlug !== undefined) {
      if (!explicitSlug || typeof explicitSlug !== "string") {
        return NextResponse.json({ message: "Invalid slug" }, { status: 400 });
      }
      update.slug = explicitSlug.trim().toLowerCase();
    }
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
    }
    const doc = await FiliereModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!doc) {
      return NextResponse.json({ message: "Filiere not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      return NextResponse.json({ message: "Slug already in use" }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to update filiere", error: err.message },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const f = await FiliereModel.findById(id);
    if (!f) {
      return NextResponse.json({ message: "Filiere not found" }, { status: 404 });
    }
    const sems = f.semestres ?? [];
    if (sems.length) {
      await SemestreModel.deleteMany({ _id: { $in: sems } });
    }
    await FiliereModel.findByIdAndDelete(id);
    return NextResponse.json({ data: { deleted: id } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete filiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}
