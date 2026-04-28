import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { AgentModel } from "@/lib/models/User";

type JuryKind = "cours" | "recherche";
type SectionAuthorizationTab = "appariteur" | "secretaire" | "president" | "secretaire-jury" | "membre";

type AgentLean = {
  _id?: unknown;
  name?: unknown;
  email?: unknown;
  matricule?: unknown;
  photo?: unknown;
  role?: unknown;
} | null;

function isValidTab(v: string): v is SectionAuthorizationTab {
  return ["appariteur", "secretaire", "president", "secretaire-jury", "membre"].includes(v);
}

function isValidJuryKind(v: string): v is JuryKind {
  return v === "cours" || v === "recherche";
}

function toAgent(raw: AgentLean) {
  if (!raw || typeof raw !== "object" || raw._id == null) return null;
  return {
    id: String(raw._id),
    name: String(raw.name ?? ""),
    email: String(raw.email ?? ""),
    matricule: String(raw.matricule ?? ""),
    photo: String(raw.photo ?? ""),
    role: String(raw.role ?? ""),
  };
}

function toAgentArray(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => toAgent(x as AgentLean))
    .filter((x): x is NonNullable<ReturnType<typeof toAgent>> => x != null);
}

function pathFor(tab: SectionAuthorizationTab, juryKind?: JuryKind): string | null {
  if (tab === "appariteur") return "gestionnaires.appariteur";
  if (tab === "secretaire") return "gestionnaires.secretaire";
  if (tab === "president") return juryKind ? `jury.${juryKind}.president` : null;
  if (tab === "secretaire-jury") return juryKind ? `jury.${juryKind}.secretaire` : null;
  if (tab === "membre") return juryKind ? `jury.${juryKind}.membres` : null;
  return null;
}

async function findSectionForOrganisateur(agentId: string, sectionId: string) {
  return SectionModel.findOne({
    _id: new Types.ObjectId(sectionId),
    $or: [
      { "bureau.chefSection": new Types.ObjectId(agentId) },
      { "bureau.chargeEnseignement": new Types.ObjectId(agentId) },
      { "bureau.chargeRecherche": new Types.ObjectId(agentId) },
    ],
  });
}

async function loadSectionPayload(sectionId: string) {
  const doc = await SectionModel.findById(sectionId)
    .select("designation slug gestionnaires jury")
    .populate([
      { path: "gestionnaires.secretaire", select: "name email matricule photo role" },
      { path: "gestionnaires.appariteur", select: "name email matricule photo role" },
      { path: "jury.cours.president", select: "name email matricule photo role" },
      { path: "jury.cours.secretaire", select: "name email matricule photo role" },
      { path: "jury.cours.membres", select: "name email matricule photo role" },
      { path: "jury.recherche.president", select: "name email matricule photo role" },
      { path: "jury.recherche.secretaire", select: "name email matricule photo role" },
      { path: "jury.recherche.membres", select: "name email matricule photo role" },
    ])
    .lean();

  if (!doc) return null;
  const d = doc as unknown as {
    _id: unknown;
    designation?: unknown;
    slug?: unknown;
    gestionnaires?: { appariteur?: AgentLean; secretaire?: AgentLean };
    jury?: {
      cours?: { president?: AgentLean; secretaire?: AgentLean; membres?: unknown };
      recherche?: { president?: AgentLean; secretaire?: AgentLean; membres?: unknown };
    };
  };
  return {
    sectionId: String(d._id),
    sectionDesignation: String(d.designation ?? ""),
    sectionSlug: String(d.slug ?? ""),
    gestionnaires: {
      appariteur: toAgent(d.gestionnaires?.appariteur ?? null),
      secretaire: toAgent(d.gestionnaires?.secretaire ?? null),
    },
    jury: {
      cours: {
        president: toAgent(d.jury?.cours?.president ?? null),
        secretaire: toAgent(d.jury?.cours?.secretaire ?? null),
        membres: toAgentArray(d.jury?.cours?.membres),
      },
      recherche: {
        president: toAgent(d.jury?.recherche?.president ?? null),
        secretaire: toAgent(d.jury?.recherche?.secretaire ?? null),
        membres: toAgentArray(d.jury?.recherche?.membres),
      },
    },
  };
}

async function guardRequest(sectionId: string) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    return { ok: false as const, response: NextResponse.json({ message: "Non authentifié" }, { status: 401 }) };
  }
  if (session.role !== "organisateur" || !Types.ObjectId.isValid(session.sub)) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Réservé aux organisateurs du bureau" }, { status: 403 }),
    };
  }
  if (!Types.ObjectId.isValid(sectionId)) {
    return { ok: false as const, response: NextResponse.json({ message: "sectionId invalide" }, { status: 400 }) };
  }
  await connectDB();
  const section = await findSectionForOrganisateur(session.sub, sectionId);
  if (!section) {
    return {
      ok: false as const,
      response: NextResponse.json({ message: "Section introuvable ou accès refusé" }, { status: 404 }),
    };
  }
  return { ok: true as const };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sectionId = String(searchParams.get("sectionId") ?? "").trim();
  const guard = await guardRequest(sectionId);
  if (!guard.ok) return guard.response;

  const data = await loadSectionPayload(sectionId);
  if (!data) return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    sectionId?: string;
    tab?: string;
    juryKind?: string;
    agentId?: string;
  };
  const sectionId = String(body.sectionId ?? "").trim();
  const tab = String(body.tab ?? "").trim();
  const juryKindRaw = String(body.juryKind ?? "").trim();
  const agentId = String(body.agentId ?? "").trim();

  const guard = await guardRequest(sectionId);
  if (!guard.ok) return guard.response;
  if (!isValidTab(tab)) {
    return NextResponse.json({ message: "tab invalide" }, { status: 400 });
  }
  if (!Types.ObjectId.isValid(agentId)) {
    return NextResponse.json({ message: "agentId invalide" }, { status: 400 });
  }
  const juryKind = juryKindRaw ? (isValidJuryKind(juryKindRaw) ? juryKindRaw : null) : undefined;
  const targetPath = pathFor(tab, juryKind);
  if (!targetPath) {
    return NextResponse.json({ message: "Type de jury requis" }, { status: 400 });
  }

  const agentExists = await AgentModel.exists({ _id: new Types.ObjectId(agentId) });
  if (!agentExists) {
    return NextResponse.json({ message: "Agent introuvable" }, { status: 404 });
  }

  if (tab === "membre") {
    await SectionModel.updateOne(
      { _id: new Types.ObjectId(sectionId) },
      { $addToSet: { [targetPath]: new Types.ObjectId(agentId) } }
    );
  } else {
    await SectionModel.updateOne(
      { _id: new Types.ObjectId(sectionId) },
      { $set: { [targetPath]: new Types.ObjectId(agentId) } }
    );
  }

  const data = await loadSectionPayload(sectionId);
  if (!data) return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as {
    sectionId?: string;
    tab?: string;
    juryKind?: string;
    agentId?: string;
  };
  const sectionId = String(body.sectionId ?? "").trim();
  const tab = String(body.tab ?? "").trim();
  const juryKindRaw = String(body.juryKind ?? "").trim();
  const agentId = String(body.agentId ?? "").trim();

  const guard = await guardRequest(sectionId);
  if (!guard.ok) return guard.response;
  if (!isValidTab(tab)) {
    return NextResponse.json({ message: "tab invalide" }, { status: 400 });
  }

  const juryKind = juryKindRaw ? (isValidJuryKind(juryKindRaw) ? juryKindRaw : null) : undefined;
  const targetPath = pathFor(tab, juryKind);
  if (!targetPath) {
    return NextResponse.json({ message: "Type de jury requis" }, { status: 400 });
  }

  if (tab === "membre") {
    if (!Types.ObjectId.isValid(agentId)) {
      return NextResponse.json({ message: "agentId invalide" }, { status: 400 });
    }
    await SectionModel.updateOne(
      { _id: new Types.ObjectId(sectionId) },
      { $pull: { [targetPath]: new Types.ObjectId(agentId) } }
    );
  } else {
    await SectionModel.updateOne({ _id: new Types.ObjectId(sectionId) }, { $unset: { [targetPath]: "" } });
  }

  const data = await loadSectionPayload(sectionId);
  if (!data) return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
  return NextResponse.json({ data }, { status: 200 });
}
