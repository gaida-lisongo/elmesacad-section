import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { AnneeModel } from "@/lib/models/Annee";
import { getSessionPayload, canManageAnnees } from "@/lib/auth/sessionServer";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canManageAnnees(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "id invalide" }, { status: 400 });
  }
  try {
    await connectDB();
    const body = (await request.json()) as {
      designation?: string;
      debut?: number;
      fin?: number;
      status?: boolean;
    };
    const u: Record<string, unknown> = {};
    if (body.designation !== undefined) u.designation = body.designation;
    if (body.debut !== undefined) u.debut = body.debut;
    if (body.fin !== undefined) u.fin = body.fin;
    if (body.status !== undefined) u.status = body.status;
    if (Object.keys(u).length === 0) {
      return NextResponse.json({ message: "Aucun champ" }, { status: 400 });
    }
    const doc = await AnneeModel.findByIdAndUpdate(id, { $set: u }, { new: true, runValidators: true });
    if (!doc) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }
    if (u.status === true) {
      await AnneeModel.updateMany(
        { _id: { $ne: doc._id }, status: true },
        { $set: { status: false } }
      );
    }
    return NextResponse.json({ data: doc });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}

export async function DELETE(_: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canManageAnnees(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "id invalide" }, { status: 400 });
  }
  try {
    await connectDB();
    const d = await AnneeModel.findByIdAndDelete(id);
    if (!d) {
      return NextResponse.json({ message: "Introuvable" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
