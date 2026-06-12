import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { listGestionnaireSessionResourcesAction } from "@/actions/gestionnaireSessionResources";
import PerceptionClient from "./PerceptionClent";

export const metadata: Metadata = {
  title: "Perception | INBTP",
};

export default async function PerceptionPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950">
        <p className="font-semibold">Accès réservé aux agents de section.</p>
      </div>
    );
  }

  // Récupérer les sessions disponibles pour la section
  const resourcesData = await listGestionnaireSessionResourcesAction({
    sectionSlug: scope.sectionSlug,
    page: 1,
    limit: 200,
    search: "",
  });

  const resources = resourcesData.rows.map((r) => ({
    id: r.id,
    designation: r.designation,
    amount: r.amount,
    currency: r.currency,
  }));

  return (
    <PerceptionClient
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      resources={resources}
    />
  );
}