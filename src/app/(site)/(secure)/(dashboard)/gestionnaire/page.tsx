import DashboardPage from "@/components/dashboard/Dashboard";
import { getSessionPayload } from "@/lib/auth/sessionServer";

export default async function GestionnaireDashboardPage() {
    const session = await getSessionPayload();
    console.log("Session payload in GestionnaireDashboardPage:", session);

    return <DashboardPage />;
}