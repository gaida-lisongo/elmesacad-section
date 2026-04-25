import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { SectionModel } from "@/lib/models/Section";

type RouteContext = { params: Promise<{ id: string }> };

const sectionPopulate = {
  path: "programmes",
  model: "Programme",
  populate: {
    path: "semestres",
    model: "Semestre",
    populate: {
      path: "unites",
      model: "UniteEnseignement",
      populate: { path: "matieres", model: "Matiere" },
    },
  },
};

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const doc = await SectionModel.findById(id).populate(sectionPopulate).lean();
    if (!doc) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch section", error: (error as Error).message },
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
    const {
      designation,
      email,
      website,
      telephone,
      description,
      credits,
      bureau: bureauIn,
    } = payload as {
      designation?: string;
      email?: string;
      website?: string;
      telephone?: string;
      description?: { title: string; contenu: string }[];
      credits?: number;
      bureau?: {
        chefSection?: string;
        chargeEnseignement?: string;
        chargeRecherche?: string;
      };
    };

    const update: Record<string, unknown> = {};
    if (designation !== undefined) update.designation = designation;
    if (email !== undefined) update.email = email;
    if (website !== undefined) update.website = website;
    if (telephone !== undefined) update.telephone = telephone;
    if (description !== undefined) update.description = description;
    if (credits !== undefined) update.credits = credits;

    if (bureauIn !== undefined) {
      const bureau: Record<string, Types.ObjectId> = {};
      for (const [k, v] of Object.entries(bureauIn)) {
        if (v == null) continue;
        if (!Types.ObjectId.isValid(String(v))) {
          return NextResponse.json({ message: `Invalid bureau field: ${k}` }, { status: 400 });
        }
        bureau[k] = new Types.ObjectId(String(v));
      }
      update.bureau = bureau;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
    }

    const doc = await SectionModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!doc) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update section", error: (error as Error).message },
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
    const section = await SectionModel.findById(id);
    if (!section) {
      return NextResponse.json({ message: "Section not found" }, { status: 404 });
    }
    for (const pid of section.programmes ?? []) {
      await SemestreModel.deleteMany({ programme: pid });
      await ProgrammeModel.findByIdAndDelete(pid);
    }
    await SectionModel.findByIdAndDelete(id);
    return NextResponse.json({ data: { deleted: id } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete section", error: (error as Error).message },
      { status: 500 }
    );
  }
}
