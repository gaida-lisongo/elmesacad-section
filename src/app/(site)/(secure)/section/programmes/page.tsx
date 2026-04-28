import type { Metadata } from "next";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import SectionProgrammesClient from "./SectionProgrammesClient";

export const metadata: Metadata = {
  title: "Programmes de section | INBTP",
};

export default async function SectionProgrammesPage() {
  const session = await getSessionPayload();
  const isOrganisateur = session?.type === "Agent" && session.role === "organisateur";

  return <SectionProgrammesClient isOrganisateur={isOrganisateur} />;
}
