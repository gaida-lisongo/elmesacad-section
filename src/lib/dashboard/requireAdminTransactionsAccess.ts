import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import userManager, { type AgentWithAuthorizations } from "@/lib/services/UserManager";
import { resolveAdminCapabilities } from "@/lib/dashboard/adminCapabilitiesFromAuthorizations";
import type { DashboardAgentAuthorization } from "@/lib/dashboard/types";

function mapAuthorizations(agent: AgentWithAuthorizations): DashboardAgentAuthorization[] {
  return agent.authorizations.map((a) => ({
    id: typeof a._id === "string" ? a._id : a._id.toString(),
    code: a.code,
    designation: a.designation,
  }));
}

/** `null` si l’agent admin peut lire / exporter les recharges (WM ou admin sans restriction). */
export async function requireAdminTransactionsAccess(): Promise<NextResponse | null> {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (session.type !== "Agent" || session.role !== "admin") {
    return NextResponse.json({ message: "Accès réservé à l’administration" }, { status: 403 });
  }

  await connectDB();
  const agent = await userManager.getUserByEmail("Agent", session.email);
  if (!agent || !("authorizations" in agent)) {
    return NextResponse.json({ message: "Profil agent introuvable" }, { status: 403 });
  }

  const caps = resolveAdminCapabilities("admin", mapAuthorizations(agent as AgentWithAuthorizations));
  if (!caps.canReadTransactions) {
    return NextResponse.json(
      { message: "Habilitation WM requise pour exporter les rapports de recharges." },
      { status: 403 }
    );
  }

  return null;
}
