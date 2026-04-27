import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const search = (searchParams.get("search") ?? "").trim();
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

    const filter =
      search.length > 0
        ? {
            $or: [
              { designation: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
              { slug: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            ],
          }
        : {};

    const [data, total] = await Promise.all([
      FiliereModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      FiliereModel.countDocuments(filter),
    ]);

    return NextResponse.json(
      { data, pagination: { offset: safeOffset, limit: safeLimit, total } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list filieres", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const payload = await request.json();
    const { designation, description } = payload as {
      designation?: string;
      description?: { title: string; contenu: string }[];
    };
    if (!designation?.trim()) {
      return NextResponse.json({ message: "designation is required" }, { status: 400 });
    }
    const slug = await buildUniqueSlug(FiliereModel, designation, {});
    const created = await FiliereModel.create({
      designation: designation.trim(),
      description: description ?? [],
      slug,
      semestres: [],
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create filiere", error: (error as Error).message },
      { status: 500 }
    );
  }
}
