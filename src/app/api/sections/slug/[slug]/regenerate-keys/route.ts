import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { getSessionPayload, canEditSensitiveFields } from "@/lib/auth/sessionServer";
import { generateApiKey, generateSecretKey } from "@/lib/utils/sectionKeys";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(_: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canEditSensitiveFields(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ message: "Slug manquant" }, { status: 400 });
  }

  try {
    await connectDB();
    const apiKey = generateApiKey();
    const secretKey = generateSecretKey();
    const doc = await SectionModel.findOneAndUpdate(
      { slug: slug.trim() },
      { $set: { apiKey, secretKey } },
      { new: true }
    ).lean();

    if (!doc) {
      return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
    }

    return NextResponse.json({
      apiKey: String(doc.apiKey),
      secretKey: String(doc.secretKey),
    });
  } catch (error) {
    return NextResponse.json(
      { message: "Régénération impossible", error: (error as Error).message },
      { status: 500 }
    );
  }
}
