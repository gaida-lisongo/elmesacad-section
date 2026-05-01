import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { getGestionnaireLaboResourceAction } from "@/actions/gestionnaireLaboResources";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import EtudiantResourceCommandesClient from "@/components/secure/etudiant-resources/EtudiantResourceCommandesClient";

export const metadata: Metadata = {
  title: "Commandes bon de laboratoire | INBTP",
};

type PageProps = { params: Promise<{ resourceId: string }> };

export default async function LaboResourceCommandesPage({ params }: PageProps) {
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
    redirect("/section/laboratoires");
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
    const detail = await getGestionnaireLaboResourceAction({
      sectionSlug: scope.sectionSlug,
      id: rid,
    });
    designation = detail.designation || rid;
    initialData = await listEtudiantResourceCommandesAction({
      context: "labo-gestionnaire",
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
      context="labo-gestionnaire"
      sectionSlug={scope.sectionSlug}
      resourceId={rid}
      resourceDesignation={designation}
      backHref="/section/laboratoires"
      backLabel="Laboratoires"
      initialData={initialData}
      initialError={initialError}
      toolbarDescription="Liste des commandes liées à ce bon de laboratoire (service étudiant — type labo)."
    />
  );
}
