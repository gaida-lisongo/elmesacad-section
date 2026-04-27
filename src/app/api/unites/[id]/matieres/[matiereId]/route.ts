import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireAdminManageFilieres } from "@/lib/auth/requireAdminManageFilieresApi";
import { connectDB } from "@/lib/services/connectedDB";
import { MatiereModel } from "@/lib/models/Matiere";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { verifierMatiereDansUnite } from "@/lib/validation/uniteMatiereCredits";

type RouteContext = { params: Promise<{ id: string; matiereId: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id, matiereId } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(matiereId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const doc = await MatiereModel.findOne({
      _id: new Types.ObjectId(matiereId),
      unite: new Types.ObjectId(id),
    }).lean();
    if (!doc) {
      return NextResponse.json({ message: "Matiere not found" }, { status: 404 });
    }
    return NextResponse.json({ data: doc }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch matiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const gate = await requireAdminManageFilieres();
    if (gate instanceof NextResponse) return gate;

    await connectDB();
    const { id, matiereId } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(matiereId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const oid = new Types.ObjectId(id);
    const matId = new Types.ObjectId(matiereId);
    const m = await MatiereModel.findOne({ _id: matId, unite: oid });
    if (!m) {
      return NextResponse.json({ message: "Matiere not found" }, { status: 404 });
    }

    const payload = await request.json();
    const { designation, credits, code, description, unite: newUnite } = payload as {
      designation?: string;
      credits?: number;
      code?: string;
      description?: { title: string; contenu: string }[];
      unite?: string;
    };

    let finalUniteId = oid;
    let finalCredits = m.credits;

    if (newUnite !== undefined) {
      if (!Types.ObjectId.isValid(newUnite)) {
        return NextResponse.json({ message: "Invalid unite id for target" }, { status: 400 });
      }
      const target = new Types.ObjectId(newUnite);
      const exists = await UniteEnseignementModel.findById(target);
      if (!exists) {
        return NextResponse.json({ message: "Target unite not found" }, { status: 404 });
      }
      if (!target.equals(oid)) {
        finalUniteId = target;
      }
    }
    if (credits !== undefined) finalCredits = credits;

    const coh = await verifierMatiereDansUnite({
      uniteCibleId: finalUniteId,
      matiereId: matId,
      creditsFinaux: finalCredits,
    });
    if (!coh.ok) {
      return NextResponse.json(
        {
          message: coh.message,
          creditsUnite: coh.creditsUnite,
          sommeMatiereActuelle: coh.sommeMatiereActuelle,
        },
        { status: 400 }
      );
    }

    if (newUnite !== undefined) {
      const target = new Types.ObjectId(newUnite);
      if (!target.equals(oid)) {
        await UniteEnseignementModel.findByIdAndUpdate(oid, { $pull: { matieres: matId } });
        await UniteEnseignementModel.findByIdAndUpdate(target, { $addToSet: { matieres: matId } });
        m.unite = target;
      }
    }

    if (designation !== undefined) m.designation = designation;
    if (credits !== undefined) m.credits = credits;
    if (code !== undefined) m.code = code;
    if (description !== undefined) m.description = description;
    await m.save();

    return NextResponse.json({ data: m }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to update matiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const gate = await requireAdminManageFilieres();
    if (gate instanceof NextResponse) return gate;

    await connectDB();
    const { id, matiereId } = await context.params;
    if (!Types.ObjectId.isValid(id) || !Types.ObjectId.isValid(matiereId)) {
      return NextResponse.json({ message: "Invalid id" }, { status: 400 });
    }
    const oid = new Types.ObjectId(id);
    const matId = new Types.ObjectId(matiereId);
    const deleted = await MatiereModel.findOneAndDelete({ _id: matId, unite: oid });
    if (!deleted) {
      return NextResponse.json({ message: "Matiere not found" }, { status: 404 });
    }
    await UniteEnseignementModel.findByIdAndUpdate(oid, { $pull: { matieres: matId } });
    return NextResponse.json({ data: { deleted: matiereId } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete matiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}
