import { NextResponse } from "next/server";
import { Types } from "mongoose";
import type { DashboardAgentAuthorization } from "@/lib/dashboard/types";
import { gateOrganisateurSectionBureau } from "@/lib/auth/gateOrganisateurSectionBureau";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveSectionDashboardFlags } from "@/lib/section/sectionDashboardFlags";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import { SemestreModel } from "@/lib/models/Semestre";
import userManager from "@/lib/services/UserManager";

export async function gateSectionChargesHoraires(sectionId: string): Promise<
  | { ok: true; agentId: string }
  | { ok: false; response: NextResponse }
> {
  const base = await gateOrganisateurSectionBureau(sectionId);
  if (!base.ok) return base;

  const session = await getSessionPayload();
  if (!session?.email) {
    return { ok: false, response: NextResponse.json({ message: "Session incomplète" }, { status: 401 }) };
  }

  await connectDB();
  const section = await SectionModel.findById(sectionId).select("bureau").lean();
  const agent = await userManager.getUserByEmail("Agent", session.email);
  const rawAuth = agent && "authorizations" in agent ? agent.authorizations : [];
  const authorizations: DashboardAgentAuthorization[] = rawAuth.map((a) => ({
    id: String(a._id),
    code: a.code,
    designation: a.designation,
  }));
  const flags = resolveSectionDashboardFlags(base.agentId, section?.bureau, authorizations);
  if (!flags.canManageChargesHoraires) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "Seul le chargé d’enseignement du bureau (ou l’autorisation CE / SCH) peut gérer les charges horaires.",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true, agentId: base.agentId };
}

/**
 * Unité rattachée à un semestre de programme → section ; même contrôle que `gateSectionChargesHoraires`.
 */
export async function gateUniteChargesHoraires(uniteId: string): Promise<
  | { ok: true; agentId: string; sectionId: string }
  | { ok: false; response: NextResponse }
> {
  if (!Types.ObjectId.isValid(uniteId)) {
    return { ok: false, response: NextResponse.json({ message: "Identifiant d’unité invalide" }, { status: 400 }) };
  }

  await connectDB();
  const sem = await SemestreModel.findOne({
    unites: new Types.ObjectId(uniteId),
    programme: { $exists: true, $ne: null },
  })
    .select("programme")
    .lean();

  if (!sem?.programme) {
    return {
      ok: false,
      response: NextResponse.json(
        { message: "Aucun programme de section ne contient cette unité d’enseignement." },
        { status: 404 }
      ),
    };
  }

  const prog = await ProgrammeModel.findById(sem.programme).select("section").lean();
  if (!prog?.section) {
    return { ok: false, response: NextResponse.json({ message: "Programme sans section." }, { status: 404 }) };
  }

  const sectionId = String(prog.section);
  const g = await gateSectionChargesHoraires(sectionId);
  if (!g.ok) return g;
  return { ok: true, agentId: g.agentId, sectionId };
}
