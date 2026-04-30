import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

export async function GET() {
  try {
    await connectDB();
    const rows = await SectionModel.find({})
      .sort({ designation: 1 })
      .select("designation slug")
      .lean()
      .exec();

    const data = rows
      .map((row) => ({
        label: String(row.designation ?? "").trim(),
        slug: String(row.slug ?? "").trim(),
      }))
      .filter((row) => row.label && row.slug);

    return NextResponse.json({ data }, { status: 200 });
  } catch {
    return NextResponse.json({ data: [] }, { status: 200 });
  }
}
