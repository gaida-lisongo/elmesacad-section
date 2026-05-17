import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import {
  listGestionnaireLaboResourcesAction,
  type LaboResourceRow,
} from "@/actions/gestionnaireLaboResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import DemandesRessourcesClient from "../DemandesRessourcesClient";

export const metadata: Metadata = {
  title: "Demandes - Laboratoires | INBTP",
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

export default async function DemandesLaboratoiresPage() {
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
    const resourcesData = await listGestionnaireLaboResourcesAction({
      sectionSlug: scope.sectionSlug,
      page: 1,
      limit: 100,
      search: "",
    });

    // Pour chaque ressource, récupérer le nombre de demandes
    const resourcesWithDemandes = await Promise.all(
      resourcesData.rows.map(async (r: LaboResourceRow) => {
        const commandes = await listEtudiantResourceCommandesAction({
          context: "labo-gestionnaire",
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
      type="labo"
      typeLabel="Laboratoires"
      typeIcon="solar:flask-bold-duotone"
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      resources={resources}
      initialError={initialError}
      detailPath="/section/laboratoires/labos"
    />
  );
}
