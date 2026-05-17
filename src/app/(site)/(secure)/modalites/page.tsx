import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import {
  listGestionnaireSessionResourcesAction,
  type SessionResourceRow,
} from "@/actions/gestionnaireSessionResources";
import {
  listGestionnaireValidationResourcesAction,
  type ValidationResourceRow,
} from "@/actions/gestionnaireValidationResources";
import {
  listGestionnaireReleveResourcesAction,
  type ReleveResourceRow,
} from "@/actions/gestionnaireReleveResources";
import {
  listGestionnaireLaboResourcesAction,
  type LaboResourceRow,
} from "@/actions/gestionnaireLaboResources";
import ModalitesResourcesClient from "./ModalitesResourcesClient";
import type { ResourceFraisItem, ResourceType } from "./types";

export const metadata: Metadata = {
  title: "Modalités de paiement | INBTP",
};

export const dynamic = "force-dynamic";

// Mapper les types de ressources vers le type unifié
function mapToResourceFraisItem(
  row: SessionResourceRow | ValidationResourceRow | ReleveResourceRow | LaboResourceRow,
  type: ResourceType
): ResourceFraisItem {
  const base: ResourceFraisItem = {
    id: row.id,
    designation: row.designation,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    brandingSectionRef: row.brandingSectionRef,
  };

  if (type === "session") {
    const r = row as SessionResourceRow;
    base.matieresCount = r.matieresCount;
    base.matieresSummary = r.matieresSummary;
  } else if (type === "validation") {
    const r = row as ValidationResourceRow;
    base.programmeClasse = r.programmeClasse;
    base.programmeFiliere = r.programmeFiliere;
    base.programmeCredits = r.programmeCredits;
    base.anneeSlug = r.anneeSlug;
  } else if (type === "releve") {
    const r = row as ReleveResourceRow;
    base.programmeClasse = r.programmeClasse;
    base.programmeFiliere = r.programmeFiliere;
    base.programmeCredits = r.programmeCredits;
    base.anneeSlug = r.anneeSlug;
  } else if (type === "labo") {
    const r = row as LaboResourceRow;
    base.matiereReference = r.matiereReference;
    base.matiereCredit = r.matiereCredit;
    base.lecteursLabel = r.lecteursLabel;
  }

  return base;
}

export default async function ModalitesPage() {
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
          Vous devez être désigné comme <strong>appariteur</strong> ou <strong>secrétaire</strong> sur une section pour
          gérer les modalités de paiement.
        </p>
      </div>
    );
  }

  // Charger toutes les ressources
  const initialData: Record<ResourceType, { rows: ResourceFraisItem[]; total: number; page: number; limit: number }> = {
    session: { rows: [], total: 0, page: 1, limit: 10 },
    validation: { rows: [], total: 0, page: 1, limit: 10 },
    releve: { rows: [], total: 0, page: 1, limit: 10 },
    labo: { rows: [], total: 0, page: 1, limit: 10 },
  };
  let initialError: string | undefined;

  try {
    const [sessions, validations, releves, labos] = await Promise.all([
      listGestionnaireSessionResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 10, search: "" }),
      listGestionnaireValidationResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 10, search: "" }),
      listGestionnaireReleveResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 10, search: "" }),
      listGestionnaireLaboResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 10, search: "" }),
    ]);

    initialData.session = {
      rows: sessions.rows.map((r) => mapToResourceFraisItem(r, "session")),
      total: sessions.total,
      page: sessions.page,
      limit: sessions.limit,
    };
    initialData.validation = {
      rows: validations.rows.map((r) => mapToResourceFraisItem(r, "validation")),
      total: validations.total,
      page: validations.page,
      limit: validations.limit,
    };
    initialData.releve = {
      rows: releves.rows.map((r) => mapToResourceFraisItem(r, "releve")),
      total: releves.total,
      page: releves.page,
      limit: releves.limit,
    };
    initialData.labo = {
      rows: labos.rows.map((r) => mapToResourceFraisItem(r, "labo")),
      total: labos.total,
      page: labos.page,
      limit: labos.limit,
    };
  } catch (e) {
    initialError = (e as Error).message;
  }

  return (
    <ModalitesResourcesClient
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      initialData={initialData}
      initialError={initialError}
    />
  );
}