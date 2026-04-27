import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireAdminManageFilieres } from "@/lib/auth/requireAdminManageFilieresApi";
import { connectDB } from "@/lib/services/connectedDB";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";

type RouteContext = { params: Promise<{ id: string; semestreId: string }> };

/**
 * Crée une unité d’enseignement et l’attache au semestre (Semestre actif — droit SA).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const gate = await requireAdminManageFilieres();
    if (gate instanceof NextResponse) return gate;

    await connectDB();
    const { id: filiereId, semestreId } = await context.params;
    if (!Types.ObjectId.isValid(filiereId) || !Types.ObjectId.isValid(semestreId)) {
      return NextResponse.json({ message: "Identifiant invalide" }, { status: 400 });
    }
    const fid = new Types.ObjectId(filiereId);
    const sid = new Types.ObjectId(semestreId);

    const sem = await SemestreModel.findOne({
      _id: sid,
      filiere: fid,
      programme: { $exists: false },
    });
    if (!sem) {
      return NextResponse.json({ message: "Semestre introuvable pour cette filière" }, { status: 404 });
    }

    const payload = await request.json();
    const { designation, credits, code, description } = payload as {
      designation?: string;
      credits?: number;
      code?: string;
      description?: { title: string; contenu: string }[];
    };
    if (!designation?.trim() || credits == null || !code?.trim()) {
      return NextResponse.json(
        { message: "designation, credits et code sont requis" },
        { status: 400 }
      );
    }

    const created = await UniteEnseignementModel.create({
      designation: designation.trim(),
      credits,
      code: code.trim().toUpperCase(),
      description: description ?? [],
      matieres: [],
    });

    await SemestreModel.findByIdAndUpdate(sid, { $addToSet: { unites: created._id } });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      return NextResponse.json({ message: "Ce code UE existe déjà" }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Création UE impossible", error: err.message },
      { status: 500 }
    );
  }
}
