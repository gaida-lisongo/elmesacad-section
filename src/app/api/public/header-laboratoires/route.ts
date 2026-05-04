import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { LaboratoireModel } from "@/lib/models/Laboratoire";

export async function GET() {
  try {
    await connectDB();
    const rows = await LaboratoireModel.find({})
      .sort({ nom: 1 })
      .select("nom slug")
      .lean()
      .exec();

    const data = rows
      .map((row) => ({
        label: String(row.nom ?? "").trim(),
        slug: String(row.slug ?? "").trim(),
      }))
      .filter((row) => row.label && row.slug);

    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
