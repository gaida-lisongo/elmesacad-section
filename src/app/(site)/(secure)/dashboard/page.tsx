import { getSessionPayload } from "@/lib/auth/sessionServer";
import type { DashboardAgentAuthorization, DashboardRole } from "@/lib/dashboard/types";
import { dashboardInfoMessage, resolveDashboardUi } from "@/lib/dashboard/resolveDashboardUi";
import { resolveAdminCapabilities } from "@/lib/dashboard/adminCapabilitiesFromAuthorizations";
import { buildOrganisateurTableData } from "@/lib/dashboard/buildOrganisateurTableData";
import { loadDashboardDataByRole } from "@/lib/services/loadDashboardDataByRole";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import type { AgentWithAuthorizations } from "@/lib/services/UserManager";
import DashboardView from "./DashboardView";

function mapSessionToDashboardRole(
  s: Awaited<ReturnType<typeof getSessionPayload>>
): DashboardRole {
  if (!s) return "organisateur";
  if (s.type === "Student") return "student";
  const r = s.role;
  if (r === "admin" || r === "titulaire" || r === "organisateur" || r === "gestionnaire") {
    return r;
  }
  return "organisateur";
}

function mapMongoAuthorizations(agent: AgentWithAuthorizations): DashboardAgentAuthorization[] {
  return agent.authorizations.map((a) => ({
    id: typeof a._id === "string" ? a._id : a._id.toString(),
    code: a.code,
    designation: a.designation,
  }));
}

export default async function DashboardPage() {
  const session = await getSessionPayload();
  const role = mapSessionToDashboardRole(session);

  let agentAuthorizations: DashboardAgentAuthorization[] = [];
  if (session?.type === "Agent" && session.email) {
    await connectDB();
    const agent = await userManager.getUserByEmail("Agent", session.email);
    if (agent && "authorizations" in agent) {
      agentAuthorizations = mapMongoAuthorizations(agent as AgentWithAuthorizations);
    }
  }

  const data = await loadDashboardDataByRole(role);
  const userName = session?.name || session?.email;
  const ui = resolveDashboardUi(role, agentAuthorizations);
  const adminCapabilities = resolveAdminCapabilities(role, agentAuthorizations);

  let tableData = data.tableData;
  if (role === "organisateur" && session?.type === "Agent" && session.sub) {
    tableData = await buildOrganisateurTableData(session.sub, agentAuthorizations);
  }

  const infoMessage = dashboardInfoMessage(role);

  return (
    <DashboardView
      title="Tableau de bord"
      role={role}
      {...(userName ? { userName } : {})}
      {...(infoMessage ? { infoMessage } : {})}
      ui={ui}
      agentAuthorizations={agentAuthorizations}
      adminCapabilities={adminCapabilities}
      chartYear={data.chartYear}
      metrics={data.metrics}
      whiteList={data.whiteList}
      chartData={data.chartData}
      tableData={tableData}
    />
  );
}
