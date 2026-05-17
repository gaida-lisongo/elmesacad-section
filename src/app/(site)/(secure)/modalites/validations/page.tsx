import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import {
  listGestionnaireValidationResourcesAction,
  type ValidationResourceRow,
} from "@/actions/gestionnaireValidationResources";
import {
  listRessourceFraisAction,
  listModalitesForRessourceFraisAction,
  type RessourceFraisRow,
  type ModaliteOption,
} from "@/actions/ressourceFraisActions";
import ModalitesRessourceFraisClient from "../ModalitesRessourceFraisClient";

export const metadata: Metadata = {
  title: "Modalités - Validations | INBTP",
};

export const dynamic = "force-dynamic";

export default async function ModalitesValidationsPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    redirect("/dashboard");
  }

  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">Accès réservé aux gestionnaires de section</p>
        <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
          Vous devez être désigné comme <strong>appariteur</strong> ou <strong>secrétaire</strong> sur une section.
        </p>
      </div>
    );
  }

  let resources: ValidationResourceRow[] = [];
  let ressourcesFrais: RessourceFraisRow[] = [];
  let modalites: ModaliteOption[] = [];
  let initialError: string | undefined;

  try {
    const [resourcesData, fraisData, modalitesData] = await Promise.all([
      listGestionnaireValidationResourcesAction({
        sectionSlug: scope.sectionSlug,
        page: 1,
        limit: 100,
        search: "",
      }),
      listRessourceFraisAction({ resourceType: "validation" }),
      listModalitesForRessourceFraisAction(),
    ]);

    resources = resourcesData.rows;
    ressourcesFrais = fraisData.rows;
    modalites = modalitesData.rows;
  } catch (e) {
    initialError = (e as Error).message;
  }

  return (
    <ModalitesRessourceFraisClient
      resourceType="validation"
      resourceTypeLabel="Validations"
      resourceTypeIcon="solar:checklist-bold-duotone"
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      resources={resources}
      ressourcesFrais={ressourcesFrais}
      modalites={modalites}
      initialError={initialError}
    />
  );
}
