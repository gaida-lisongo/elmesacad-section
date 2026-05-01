import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { getGestionnaireReleveResourceAction } from "@/actions/gestionnaireReleveResources";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import EtudiantResourceCommandesClient from "@/components/secure/etudiant-resources/EtudiantResourceCommandesClient";

export const metadata: Metadata = {
  title: "Commandes relevé de cotes | INBTP",
};

type PageProps = { params: Promise<{ resourceId: string }> };

export default async function ReleveResourceCommandesPage({ params }: PageProps) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    redirect("/dashboard");
  }

  const { resourceId } = await params;
  const rid = String(resourceId ?? "").trim();
  if (!rid) {
    redirect("/section/releves");
  }

  let designation = rid;
  let initialData: {
    rows: SujetCommandeListRow[];
    total: number;
    page: number;
    limit: number;
  } = { rows: [], total: 0, page: 1, limit: 20 };
  let initialError: string | undefined;

  try {
    const detail = await getGestionnaireReleveResourceAction({
      sectionSlug: scope.sectionSlug,
      id: rid,
    });
    designation = detail.designation || rid;
    initialData = await listEtudiantResourceCommandesAction({
      context: "releve-gestionnaire",
      sectionSlug: scope.sectionSlug,
      resourceId: rid,
      page: 1,
      limit: 20,
    });
  } catch (e) {
    initialError = (e as Error).message;
  }

  return (
    <EtudiantResourceCommandesClient
      context="releve-gestionnaire"
      sectionSlug={scope.sectionSlug}
      resourceId={rid}
      resourceDesignation={designation}
      backHref="/section/releves"
      backLabel="Relevés de cotes"
      initialData={initialData}
      initialError={initialError}
      toolbarDescription="Demandes liées à ce relevé de cotes (commandes de type « resultat », service étudiant)."
    />
  );
}
