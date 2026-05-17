import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import {
  listGestionnaireSessionResourcesAction,
  type SessionResourceRow,
} from "@/actions/gestionnaireSessionResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import DemandesRessourcesClient from "../DemandesRessourcesClient";

export const metadata: Metadata = {
  title: "Demandes - Sessions | INBTP",
};

export const dynamic = "force-dynamic";

type ResourceWithDemandes = {
  id: string;
  designation: string;
  amount: number;
  currency: string;
  status: string;
  demandesCount: number;
  demandesPaid: number;
  demandesPending: number;
};

export default async function DemandesSessionsPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) redirect("/dashboard");

  let resources: ResourceWithDemandes[] = [];
  let initialError: string | undefined;

  try {
    const resourcesData = await listGestionnaireSessionResourcesAction({
      sectionSlug: scope.sectionSlug,
      page: 1,
      limit: 100,
      search: "",
    });

    // Pour chaque ressource, récupérer le nombre de demandes
    const resourcesWithDemandes = await Promise.all(
      resourcesData.rows.map(async (r: SessionResourceRow) => {
        const commandes = await listEtudiantResourceCommandesAction({
          context: "session-gestionnaire",
          sectionSlug: scope.sectionSlug,
          resourceId: r.id,
          page: 1,
          limit: 1000,
        });

        const paid = commandes.rows.filter((c: { payment?: string }) => 
          c.payment?.toLowerCase() === "success" || c.payment?.toLowerCase() === "paid"
        ).length;

        return {
          id: r.id,
          designation: r.designation,
          amount: r.amount,
          currency: r.currency,
          status: r.status,
          demandesCount: commandes.total,
          demandesPaid: paid,
          demandesPending: commandes.total - paid,
        };
      })
    );

    resources = resourcesWithDemandes;
  } catch (e) {
    initialError = (e as Error).message;
  }

  return (
    <DemandesRessourcesClient
      type="session"
      typeLabel="Sessions"
      typeIcon="solar:calendar-date-bold-duotone"
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      resources={resources}
      initialError={initialError}
      detailPath="/section/enrollements/sessions"
    />
  );
}
