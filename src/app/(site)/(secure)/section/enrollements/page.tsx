import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import {
  listGestionnaireSessionResourcesAction,
  type SessionResourceRow,
} from "@/actions/gestionnaireSessionResources";
import GestionnaireSessionResourcesClient from "./GestionnaireSessionResourcesClient";

export const metadata: Metadata = {
  title: "Enrollements session | INBTP",
};

export default async function GestionnaireEnrollementsPage() {
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
          gérer les sessions d&apos;enrôlement du service étudiant.
        </p>
      </div>
    );
  }

  let initialData: { rows: SessionResourceRow[]; total: number; page: number; limit: number } = {
    rows: [],
    total: 0,
    page: 1,
    limit: 10,
  };
  let initialError: string | undefined;
  try {
    initialData = await listGestionnaireSessionResourcesAction({
      sectionSlug: scope.sectionSlug,
      page: 1,
      limit: 10,
      search: "",
    });
  } catch (e) {
    initialError = (e as Error).message;
  }

  const programmeRows = await ProgrammeModel.find({ section: new Types.ObjectId(scope.sectionId) })
    .select("_id slug designation credits")
    .sort({ designation: 1 })
    .lean();
  const programmes = programmeRows.map((p) => ({
    id: String((p as { _id: unknown })._id),
    slug: String((p as { slug?: string }).slug ?? "").trim(),
    designation: String((p as { designation?: string }).designation ?? "").trim(),
    credits: Number((p as { credits?: number }).credits ?? 0),
  }));

  const sectionDoc = await SectionModel.findById(scope.sectionId)
    .select("designation bureau.chefSection")
    .populate({ path: "bureau.chefSection", select: "name telephone email" })
    .lean();
  const chefRaw =
    sectionDoc && typeof sectionDoc === "object" && "bureau" in sectionDoc
      ? (sectionDoc as { bureau?: { chefSection?: unknown } }).bureau?.chefSection
      : undefined;
  const chefSection = {
    name:
      chefRaw && typeof chefRaw === "object" && "name" in chefRaw
        ? String((chefRaw as { name?: string }).name ?? "").trim()
        : "",
    telephone:
      chefRaw && typeof chefRaw === "object" && "telephone" in chefRaw
        ? String((chefRaw as { telephone?: string }).telephone ?? "").trim()
        : "",
    email:
      chefRaw && typeof chefRaw === "object" && "email" in chefRaw
        ? String((chefRaw as { email?: string }).email ?? "").trim()
        : "",
  };

  return (
    <GestionnaireSessionResourcesClient
      sectionId={scope.sectionId}
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      programmes={programmes}
      chefSection={chefSection}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
