import { NextResponse } from "next/server";
import { requireAdminManageFilieres } from "@/lib/auth/requireAdminManageFilieresApi";
import { connectDB } from "@/lib/services/connectedDB";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

    const [data, total] = await Promise.all([
      UniteEnseignementModel.find()
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      UniteEnseignementModel.countDocuments(),
    ]);

    return NextResponse.json(
      { data, pagination: { offset: safeOffset, limit: safeLimit, total } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list unites", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const gate = await requireAdminManageFilieres();
    if (gate instanceof NextResponse) return gate;

    await connectDB();
    const payload = await request.json();
    const { designation, credits, code, description } = payload as {
      designation?: string;
      credits?: number;
      code?: string;
      description?: { title: string; contenu: string }[];
    };

    if (designation == null || credits == null || !code?.trim()) {
      return NextResponse.json(
        { message: "designation, credits, and code are required" },
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

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    const err = error as { code?: number; message: string };
    if (err.code === 11000) {
      return NextResponse.json({ message: "A unit with this code already exists" }, { status: 409 });
    }
    return NextResponse.json(
      { message: "Failed to create unit", error: err.message },
      { status: 500 }
    );
  }
}
