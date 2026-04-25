import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { MatiereModel } from "@/lib/models/Matiere";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const doc = await UniteEnseignementModel.findById(id).populate("matieres").lean();
    if (!doc) {
      return NextResponse.json({ message: "Unite not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch unit", error: (error as Error).message },
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
    const { designation, credits, code, description } = payload as {
      designation?: string;
      credits?: number;
      code?: string;
      description?: { title: string; contenu: string }[];
    };
    const update: Record<string, unknown> = {};
    if (designation !== undefined) update.designation = designation;
    if (credits !== undefined) update.credits = credits;
    if (code !== undefined) update.code = String(code).trim().toUpperCase();
    if (description !== undefined) update.description = description;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });
    }

    const doc = await UniteEnseignementModel.findByIdAndUpdate(id, { $set: update }, { new: true, runValidators: true });
    if (!doc) {
      return NextResponse.json({ message: "Unite not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      return NextResponse.json({ message: "A unit with this code already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to update unit", error: err.message },
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
    const unite = await UniteEnseignementModel.findById(id);
    if (!unite) {
      return NextResponse.json({ message: "Unite not found" }, { status: 404 });
    }

    const mIds = unite.matieres ?? [];
    if (mIds.length) {
      await MatiereModel.deleteMany({ _id: { $in: mIds } });
    }
    const oid = new Types.ObjectId(id);
    await SemestreModel.updateMany({ unites: oid }, { $pull: { unites: oid } });
    await UniteEnseignementModel.findByIdAndDelete(id);

    return NextResponse.json({ data: { deleted: id } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete unit", error: (error as Error).message },
      { status: 500 }
    );
  }
}
