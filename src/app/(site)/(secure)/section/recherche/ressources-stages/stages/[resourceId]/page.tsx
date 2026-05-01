import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { getOrganisateurStageBureauSection } from "@/lib/section/getOrganisateurStageBureauSection";
import { getOrganisateurStageResourceAction, type SujetCommandeListRow } from "@/actions/organisateurStageResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import EtudiantResourceCommandesClient from "@/components/secure/etudiant-resources/EtudiantResourceCommandesClient";

export const metadata: Metadata = {
  title: "Commandes stage | INBTP",
};

type PageProps = { params: Promise<{ resourceId: string }> };

export default async function StageResourceCommandesPage({ params }: PageProps) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    redirect("/dashboard");
  }

  const sectionCtx = await getOrganisateurStageBureauSection(session.sub);
  if (!sectionCtx) {
    redirect("/dashboard");
  }

  const { resourceId } = await params;
  const rid = String(resourceId ?? "").trim();
  if (!rid) {
    redirect("/section/recherche/ressources-stages");
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
    const detail = await getOrganisateurStageResourceAction({
      sectionSlug: sectionCtx.sectionSlug,
      id: rid,
    });
    designation = detail.designation || rid;
    initialData = await listEtudiantResourceCommandesAction({
      context: "stage-enseignement",
      sectionSlug: sectionCtx.sectionSlug,
      resourceId: rid,
      page: 1,
      limit: 20,
    });
  } catch (e) {
    initialError = (e as Error).message;
  }

  return (
    <EtudiantResourceCommandesClient
      context="stage-enseignement"
      sectionSlug={sectionCtx.sectionSlug}
      resourceId={rid}
      resourceDesignation={designation}
      backHref="/section/recherche/ressources-stages"
      backLabel="Ressources stages"
      initialData={initialData}
      initialError={initialError}
      toolbarDescription="Liste des commandes liées à cette ressource (microservice étudiant — filtre admin ressource + type stage)."
    />
  );
}
