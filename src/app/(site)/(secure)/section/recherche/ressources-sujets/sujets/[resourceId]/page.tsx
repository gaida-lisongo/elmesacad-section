import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { getOrganisateurChargeRechercheSection } from "@/lib/section/getOrganisateurChargeRechercheSection";
import { getOrganisateurSujetResourceAction, type SujetCommandeListRow } from "@/actions/organisateurSujetResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import EtudiantResourceCommandesClient from "@/components/secure/etudiant-resources/EtudiantResourceCommandesClient";

export const metadata: Metadata = {
  title: "Commandes sujet | INBTP",
};

type PageProps = { params: Promise<{ resourceId: string }> };

export default async function SujetResourceCommandesPage({ params }: PageProps) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    redirect("/dashboard");
  }

  const sectionCtx = await getOrganisateurChargeRechercheSection(session.sub);
  if (!sectionCtx) {
    redirect("/dashboard");
  }

  const { resourceId } = await params;
  const rid = String(resourceId ?? "").trim();
  if (!rid) {
    redirect("/section/recherche/ressources-sujets");
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
    const detail = await getOrganisateurSujetResourceAction({
      sectionSlug: sectionCtx.sectionSlug,
      id: rid,
    });
    designation = detail.designation || rid;
    initialData = await listEtudiantResourceCommandesAction({
      context: "sujet-recherche",
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
      context="sujet-recherche"
      sectionSlug={sectionCtx.sectionSlug}
      resourceId={rid}
      resourceDesignation={designation}
      backHref="/section/recherche/ressources-sujets"
      backLabel="Ressources sujets"
      initialData={initialData}
      initialError={initialError}
      toolbarDescription="Liste des commandes liées à cette ressource (microservice étudiant — filtre admin ressource + type sujet)."
    />
  );
}
