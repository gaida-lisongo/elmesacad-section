import DashboardPage from "@/components/dashboard/Dashboard";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { mapMongoAuthorizations, mapSessionToDashboardRole } from "../../dashboard/page";
import { DashboardAgentAuthorization } from "@/lib/dashboard/types";
import { connectDB } from "@/lib/services/connectedDB";
import UserManager, { AgentWithAuthorizations } from "@/lib/services/UserManager";
import { loadDashboardDataByRole } from "@/lib/services/loadDashboardDataByRole";
import { resolveDashboardUi } from "@/lib/dashboard/resolveDashboardUi";
import DashboardGestionnaire from "@/components/dashboard/DashboardGestionnaire";

export default async function GestionnaireDashboardPage() {
    const session = await getSessionPayload();
    const role = mapSessionToDashboardRole(session);

    let agentAutorizations: DashboardAgentAuthorization[] = [];

    if (session?.type === "Agent" && session.email) {
        await connectDB();
        const agent = await UserManager.getUserByEmail("Agent", session.email);
        if (agent && "authorizations" in agent) {
            agentAutorizations = mapMongoAuthorizations(agent as AgentWithAuthorizations);
        }
    }

    const data = await loadDashboardDataByRole(role);
    const userName = session?.name || session?.email;
    const ui = resolveDashboardUi(role, agentAutorizations);
    
    return <DashboardGestionnaire data={data} userName={userName} ui={ui} />;
}