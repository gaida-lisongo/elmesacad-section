import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { MatiereModel } from "@/lib/models/Matiere";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";

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

export async function POST(request: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;
    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid unite id" }, { status: 400 });
    }
    const oid = new Types.ObjectId(id);
    const payload = await request.json();
    const { designation, credits, code, description } = payload as {
      designation?: string;
      credits?: number;
      code?: string;
      description?: { title: string; contenu: string }[];
    };
    if (designation == null || credits == null) {
      return NextResponse.json(
        { message: "designation and credits are required" },
        { status: 400 }
      );
    }
    const unite = await UniteEnseignementModel.findById(oid);
    if (!unite) {
      return NextResponse.json({ message: "Unite not found" }, { status: 404 });
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
