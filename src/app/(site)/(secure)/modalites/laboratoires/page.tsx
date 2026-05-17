import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";

export const metadata: Metadata = {
  title: "Laboratoires - Modalités | INBTP",
};

export default async function ModalitesLaboratoiresPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    redirect("/dashboard");
  }

  // Rediriger vers la page principale des modalités avec l'onglet laboratoires actif
  redirect("/modalites?tab=labo");
}
