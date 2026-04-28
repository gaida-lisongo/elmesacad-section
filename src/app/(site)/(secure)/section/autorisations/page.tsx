import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import SectionAutorisationsClient from "./SectionAutorisationsClient";

type AgentView = {
  id: string;
  name: string;
  email: string;
  matricule: string;
  photo: string;
  role: string;
};

type LocalSectionAssignments = {
  sectionId: string;
  sectionDesignation: string;
  sectionSlug: string;
  gestionnaires: {
    appariteur: AgentView | null;
    secretaire: AgentView | null;
  };
  jury: {
    cours: {
      president: AgentView | null;
      secretaire: AgentView | null;
      membres: AgentView[];
    };
    recherche: {
      president: AgentView | null;
      secretaire: AgentView | null;
      membres: AgentView[];
    };
  };
};

type MaybeAgentDoc = {
  _id?: unknown;
  name?: unknown;
  email?: unknown;
  matricule?: unknown;
  photo?: unknown;
  role?: unknown;
} | null;

function toAgentView(raw: MaybeAgentDoc): AgentView | null {
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

function toAgentViewArray(raw: unknown): AgentView[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => toAgentView(x as MaybeAgentDoc)).filter((x): x is AgentView => x != null);
}

export default async function SectionAutorisationsPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    return <section className="rounded-xl border border-rose-200 bg-rose-50/50 p-5 text-sm">Non authentifié.</section>;
  }
  if (session.role !== "organisateur" || !Types.ObjectId.isValid(session.sub)) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-sm">
        Cette page est réservée aux organisateurs membres du bureau d&apos;une section.
      </section>
    );
  }

  await connectDB();
  const oid = new Types.ObjectId(session.sub);
  const doc = await SectionModel.findOne({
    $or: [
      { "bureau.chefSection": oid },
      { "bureau.chargeEnseignement": oid },
      { "bureau.chargeRecherche": oid },
    ],
  })
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

  if (!doc) {
    return (
      <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5 text-sm">
        Aucune section rattachée à votre bureau n&apos;a été trouvée.
      </section>
    );
  }

  const data = doc as unknown as {
    _id: unknown;
    designation?: unknown;
    slug?: unknown;
    gestionnaires?: { appariteur?: MaybeAgentDoc; secretaire?: MaybeAgentDoc };
    jury?: {
      cours?: { president?: MaybeAgentDoc; secretaire?: MaybeAgentDoc; membres?: unknown };
      recherche?: { president?: MaybeAgentDoc; secretaire?: MaybeAgentDoc; membres?: unknown };
    };
  };

  const initialData: LocalSectionAssignments = {
    sectionId: String(data._id),
    sectionDesignation: String(data.designation ?? ""),
    sectionSlug: String(data.slug ?? ""),
    gestionnaires: {
      appariteur: toAgentView(data.gestionnaires?.appariteur ?? null),
      secretaire: toAgentView(data.gestionnaires?.secretaire ?? null),
    },
    jury: {
      cours: {
        president: toAgentView(data.jury?.cours?.president ?? null),
        secretaire: toAgentView(data.jury?.cours?.secretaire ?? null),
        membres: toAgentViewArray(data.jury?.cours?.membres),
      },
      recherche: {
        president: toAgentView(data.jury?.recherche?.president ?? null),
        secretaire: toAgentView(data.jury?.recherche?.secretaire ?? null),
        membres: toAgentViewArray(data.jury?.recherche?.membres),
      },
    },
  };

  return <SectionAutorisationsClient initialData={initialData} />;
}
