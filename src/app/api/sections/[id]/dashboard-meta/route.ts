import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import type { DashboardAgentAuthorization } from "@/lib/dashboard/types";
import { resolveSectionDashboardFlags } from "@/lib/section/sectionDashboardFlags";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import userManager from "@/lib/services/UserManager";

type RouteContext = { params: Promise<{ id: string }> };

type AgentSnippet = { id: string; name: string; email: string } | null;

function agentLeanToSnippet(doc: unknown): AgentSnippet {
  if (!doc || typeof doc !== "object") return null;
  const o = doc as { _id?: unknown; name?: string; email?: string };
  const id = o._id != null ? String(o._id) : "";
  if (!id) return null;
  return { id, name: (o.name ?? "").trim() || "—", email: (o.email ?? "").trim() };
}

export async function GET(_: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await getSessionPayload();
  const agentId = session?.type === "Agent" && Types.ObjectId.isValid(session.sub) ? session.sub : "";
  const agentEmail = session?.email ?? "";

  if (!Types.ObjectId.isValid(id)) {
    return NextResponse.json({ message: "Identifiant invalide" }, { status: 400 });
  }

  try {
    await connectDB();
    const section = await SectionModel.findById(id)
      .select("designation slug cycle bureau gestionnaires")
      .populate([
        { path: "gestionnaires.secretaire", select: "name email" },
        { path: "gestionnaires.appariteur", select: "name email" },
      ])
      .lean();

    if (!section) {
      return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
    }

    const agent = agentEmail ? await userManager.getUserByEmail("Agent", agentEmail) : null;
    const rawAuth = agent && "authorizations" in agent ? agent.authorizations : [];
    const authorizations: DashboardAgentAuthorization[] = rawAuth.map((a) => ({
      id: String(a._id),
      code: a.code,
      designation: a.designation,
    }));

    const flags = resolveSectionDashboardFlags(agentId, section.bureau, authorizations);

    const g = section.gestionnaires;
    const gestionnaires = {
      secretaire: agentLeanToSnippet(g?.secretaire),
      appariteur: agentLeanToSnippet(g?.appariteur),
    };

    return NextResponse.json(
      {
        data: {
          section: {
            _id: String(section._id),
            designation: section.designation,
            slug: section.slug,
            cycle: section.cycle,
          },
          gestionnaires,
          flags,
          authorizations,
        },
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
