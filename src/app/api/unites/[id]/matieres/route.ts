import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { requireAdminManageFilieres } from "@/lib/auth/requireAdminManageFilieresApi";
import { connectDB } from "@/lib/services/connectedDB";
import { MatiereModel } from "@/lib/models/Matiere";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { verifierAjoutCreditsMatiere } from "@/lib/validation/uniteMatiereCredits";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid unite id" }, { status: 400 });
    }
    const data = await MatiereModel.find({ unite: new Types.ObjectId(id) })
      .sort({ createdAt: -1 })
      .lean();
    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list matieres", error: (error as Error).message },
      { status: 500 }
    );
  }
}

type MatiereCreateItem = {
  designation?: string;
  credits?: number;
  code?: string;
  description?: { title: string; contenu: string }[];
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const gate = await requireAdminManageFilieres();
    if (gate instanceof NextResponse) return gate;

    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid unite id" }, { status: 400 });
    }
    const oid = new Types.ObjectId(id);
    const payload = (await request.json()) as MatiereCreateItem & { matieres?: MatiereCreateItem[] };

    const unite = await UniteEnseignementModel.findById(oid);
    if (!unite) {
      return NextResponse.json({ message: "Unite not found" }, { status: 404 });
    }

    if (Array.isArray(payload.matieres)) {
      const items = payload.matieres.filter((m) => m?.designation != null && m.credits != null);
      if (items.length === 0) {
        return NextResponse.json({ data: [] }, { status: 201 });
      }
      const docs = items.map((m) => ({
        unite: oid,
        designation: String(m.designation).trim(),
        credits: m.credits as number,
        code: m.code?.trim(),
        description: Array.isArray(m.description) ? m.description : [],
      }));
      const creditsAjoutes = docs.reduce((s, d) => s + (Number(d.credits) || 0), 0);
      const coh = await verifierAjoutCreditsMatiere(oid, creditsAjoutes);
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
      const created = await MatiereModel.insertMany(docs);
      const ids = created.map((d) => d._id);
      await UniteEnseignementModel.findByIdAndUpdate(oid, { $push: { matieres: { $each: ids } } });
      return NextResponse.json({ data: created }, { status: 201 });
    }

    const { designation, credits, code, description } = payload;
    if (designation == null || credits == null) {
      return NextResponse.json(
        { message: "designation and credits are required" },
        { status: 400 }
      );
    }

    const coh = await verifierAjoutCreditsMatiere(oid, Number(credits) || 0);
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

    const [created] = await MatiereModel.create([
      {
        unite: oid,
        designation: designation.trim(),
        credits,
        code: code?.trim(),
        description: description ?? [],
      },
    ]);
    await UniteEnseignementModel.findByIdAndUpdate(oid, { $addToSet: { matieres: created._id } });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create matiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}
