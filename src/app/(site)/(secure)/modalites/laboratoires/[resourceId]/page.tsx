import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { getGestionnaireLaboResourceAction } from "@/actions/gestionnaireLaboResources";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";
import EtudiantResourceCommandesClient from "@/components/secure/etudiant-resources/EtudiantResourceCommandesClient";

export const metadata: Metadata = {
  title: "Vérification paiement - Laboratoire | INBTP",
};

type PageProps = { params: Promise<{ resourceId: string }> };

export default async function ModalitesLaboCommandesPage({ params }: PageProps) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) redirect("/dashboard");

  const { resourceId } = await params;
  const rid = String(resourceId ?? "").trim();
  if (!rid) redirect("/modalites");

  let designation = rid;
  let initialData: { rows: SujetCommandeListRow[]; total: number; page: number; limit: number } = {
    rows: [],
    total: 0,
    page: 1,
    limit: 20,
  };
  let initialError: string | undefined;

  try {
    const detail = await getGestionnaireLaboResourceAction({ sectionSlug: scope.sectionSlug, id: rid });
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
      backHref="/modalites"
      backLabel="Modalités de paiement"
      initialData={initialData}
      initialError={initialError}
      toolbarTitle="Vérification des paiements"
      toolbarDescription="Vérifiez les paiements des étudiants pour ce bon de laboratoire avant de valider leur accès."
    />
  );
}
