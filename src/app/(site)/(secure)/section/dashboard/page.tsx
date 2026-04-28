import type { Metadata } from "next";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import SectionDashboardClient from "./SectionDashboardClient";

export const metadata: Metadata = {
  title: "Tableau de bord section | INBTP",
};

export default async function SectionDashboardPage() {
  const session = await getSessionPayload();
  const isOrganisateur = session?.type === "Agent" && session.role === "organisateur";

  return <SectionDashboardClient isOrganisateur={isOrganisateur} />;
}
