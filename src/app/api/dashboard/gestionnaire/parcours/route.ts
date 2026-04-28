import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { ProgrammeModel } from "@/lib/models/Programme";
import { AnneeModel } from "@/lib/models/Annee";

async function resolveGuard() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    return { ok: false as const, response: NextResponse.json({ message: "Non authentifié" }, { status: 401 }) };
  }
  if (session.role !== "gestionnaire") {
    return { ok: false as const, response: NextResponse.json({ message: "Réservé aux gestionnaires" }, { status: 403 }) };
  }
  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { message: "Aucune section locale trouvée pour ce gestionnaire (appariteur/secrétaire)." },
        { status: 403 }
      ),
    };
  }
  return { ok: true as const, scope };
}

async function loadSectionProgrammes(sectionId: string) {
  const rows = await ProgrammeModel.find({ section: new Types.ObjectId(sectionId) })
    .sort({ designation: 1 })
    .select("_id designation slug credits code_unite code")
    .lean();
  return rows.map((row) => {
    const r = row as unknown as {
      _id: unknown;
      designation?: unknown;
      slug?: unknown;
      credits?: unknown;
      code_unite?: unknown;
      code?: unknown;
    };
    return {
      id: String(r._id),
      designation: String(r.designation ?? ""),
      slug: String(r.slug ?? ""),
      credits: Number(r.credits ?? 0),
      code: String(r.code ?? r.code_unite ?? ""),
    };
  });
}

async function loadAnneeById(anneeId: string) {
  if (!Types.ObjectId.isValid(anneeId)) return null;
  const doc = await AnneeModel.findById(anneeId).select("designation slug debut fin status").lean();
  if (!doc) return null;
  const d = doc as unknown as {
    _id: unknown;
    designation?: unknown;
    slug?: unknown;
    debut?: unknown;
    fin?: unknown;
    status?: unknown;
  };
  return {
    id: String(d._id),
    designation: String(d.designation ?? ""),
    slug: String(d.slug ?? ""),
    debut: String(d.debut ?? ""),
    fin: String(d.fin ?? ""),
    status: Boolean(d.status),
  };
}

export async function GET(request: Request) {
  const guard = await resolveGuard();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(request.url);
  const anneeId = String(searchParams.get("anneeId") ?? "").trim();
  const programmeId = String(searchParams.get("programmeId") ?? "").trim();
  if (!anneeId) {
    return NextResponse.json({ message: "anneeId requis" }, { status: 400 });
  }

  try {
    const annee = await loadAnneeById(anneeId);
    if (!annee) {
      return NextResponse.json({ message: "Année introuvable" }, { status: 404 });
    }
    const programmes = await loadSectionProgrammes(guard.scope.sectionId);
    const selectedProgramme = programmeId ? programmes.find((p) => p.id === programmeId) : null;
    if (programmeId && !selectedProgramme) {
      return NextResponse.json({ message: "programmeId invalide pour cette section" }, { status: 400 });
    }
    return NextResponse.json(
      {
        canCreateDelete: guard.scope.isAppariteur,
        canUpdateStatus: guard.scope.isSecretaire,
        scope: {
          sectionId: guard.scope.sectionId,
          sectionDesignation: guard.scope.sectionDesignation,
          sectionSlug: guard.scope.sectionSlug,
        },
        programmes,
        annee,
        selectedProgrammeSlug: selectedProgramme?.slug ?? "",
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: (error as Error).message || "Échec de chargement des parcours" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  void request;
  return NextResponse.json(
    { message: "Utiliser les Server Actions pour STUDENT_SERVICE." },
    { status: 405 }
  );
}

export async function PATCH(request: Request) {
  void request;
  return NextResponse.json(
    { message: "Utiliser les Server Actions pour STUDENT_SERVICE." },
    { status: 405 }
  );
}

export async function DELETE(request: Request) {
  void request;
  return NextResponse.json(
    { message: "Utiliser les Server Actions pour STUDENT_SERVICE." },
    { status: 405 }
  );
}
