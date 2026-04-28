import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { ProgrammeModel } from "@/lib/models/Programme";
import { AnneeModel } from "@/lib/models/Annee";

export async function GET(request: Request) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    return NextResponse.json({ message: "Réservé aux gestionnaires" }, { status: 403 });
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    return NextResponse.json({ message: "Aucune section locale trouvée pour ce gestionnaire." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const programmeSlug = String(searchParams.get("programmeSlug") ?? "").trim();
  const anneeSlug = String(searchParams.get("anneeSlug") ?? "").trim();
  if (!programmeSlug || !anneeSlug) {
    return NextResponse.json({ message: "programmeSlug et anneeSlug requis" }, { status: 400 });
  }

  const programme = await ProgrammeModel.findOne({
    slug: programmeSlug,
    section: new Types.ObjectId(scope.sectionId),
  })
    .select("_id designation slug credits")
    .lean();
  if (!programme) {
    return NextResponse.json({ message: "Programme introuvable pour votre section" }, { status: 404 });
  }

  const annee = await AnneeModel.findOne({ slug: anneeSlug }).select("_id designation slug debut fin").lean();
  if (!annee) {
    return NextResponse.json({ message: "Année introuvable" }, { status: 404 });
  }

  return NextResponse.json(
    {
      scope: {
        sectionId: scope.sectionId,
        sectionDesignation: scope.sectionDesignation,
        sectionSlug: scope.sectionSlug,
      },
      programme: {
        id: String((programme as { _id: unknown })._id),
        designation: String((programme as { designation?: unknown }).designation ?? ""),
        slug: String((programme as { slug?: unknown }).slug ?? ""),
        credits: Number((programme as { credits?: unknown }).credits ?? 0),
      },
      annee: {
        id: String((annee as { _id: unknown })._id),
        designation: String((annee as { designation?: unknown }).designation ?? ""),
        slug: String((annee as { slug?: unknown }).slug ?? ""),
        debut: String((annee as { debut?: unknown }).debut ?? ""),
        fin: String((annee as { fin?: unknown }).fin ?? ""),
      },
      canCreateDelete: scope.isAppariteur,
      canUpdateStatus: scope.isSecretaire,
    },
    { status: 200 }
  );
}
