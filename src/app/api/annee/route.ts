import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { AnneeModel } from "@/lib/models/Annee";
import { getSessionPayload, isAgentSession, canManageAnnees } from "@/lib/auth/sessionServer";
import { slugifyDesignation, buildUniqueSlug } from "@/lib/utils/formationSlug";

export async function GET() {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }
  try {
    await connectDB();
    const list = await AnneeModel.find().sort({ debut: -1 }).lean();
    return NextResponse.json({ data: list });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canManageAnnees(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }
  try {
    await connectDB();
    const body = (await request.json()) as {
      designation?: string;
      debut?: number;
      fin?: number;
      slug?: string;
      status?: boolean;
    };
    if (body.debut == null || body.fin == null) {
      return NextResponse.json({ message: "debut et fin requis" }, { status: 400 });
    }
    const designation = String(body.designation ?? "").trim() || `${body.debut}–${body.fin}`;
    const baseSlug = (body.slug && String(body.slug).trim()) || slugifyDesignation(designation);
    const slug = await buildUniqueSlug(AnneeModel as Parameters<typeof buildUniqueSlug>[0], baseSlug, {});
    const created = await AnneeModel.create({
      designation,
      debut: body.debut,
      fin: body.fin,
      slug,
      status: body.status === true,
    });
    if (created.status) {
      await AnneeModel.updateMany(
        { _id: { $ne: created._id }, status: true },
        { $set: { status: false } }
      );
    }
    return NextResponse.json({ data: created });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
