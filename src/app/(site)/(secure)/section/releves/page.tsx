import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import { AnneeModel } from "@/lib/models/Annee";
import {
  listGestionnaireReleveResourcesAction,
  type ReleveResourceRow,
} from "@/actions/gestionnaireReleveResources";
import GestionnaireReleveResourcesClient from "./GestionnaireReleveResourcesClient";

export const metadata: Metadata = {
  title: "Relevés de cotes | INBTP",
};

export default async function GestionnaireRelevesPage() {
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
          Vous devez être désigné comme <strong>appariteur</strong> ou <strong>secrétaire</strong> sur une section
          pour gérer les fiches de validation du service étudiant.
        </p>
      </div>
    );
  }

  let initialData: { rows: ReleveResourceRow[]; total: number; page: number; limit: number } = {
    rows: [],
    total: 0,
    page: 1,
    limit: 10,
  };
  let initialError: string | undefined;
  try {
    initialData = await listGestionnaireReleveResourcesAction({
      sectionSlug: scope.sectionSlug,
      page: 1,
      limit: 10,
      search: "",
    });
  } catch (e) {
    initialError = (e as Error).message;
  }

  const programmeRows = await ProgrammeModel.find({ section: new Types.ObjectId(scope.sectionId) })
    .select("slug designation credits")
    .sort({ designation: 1 })
    .lean();
  const programmes = programmeRows.map((p) => ({
    slug: String((p as { slug?: string }).slug ?? "").trim(),
    designation: String((p as { designation?: string }).designation ?? "").trim(),
    credits: Number((p as { credits?: number }).credits ?? 0),
  }));

  const anneeRows = await AnneeModel.find({})
    .select("slug designation debut fin status")
    .sort({ debut: -1 })
    .lean();
  const annees = anneeRows.map((a) => ({
    slug: String((a as { slug?: string }).slug ?? "").trim(),
    designation: String((a as { designation?: string }).designation ?? "").trim(),
    debut: Number((a as { debut?: number }).debut ?? 0),
    fin: Number((a as { fin?: number }).fin ?? 0),
  }));

  const sectionDoc = await SectionModel.findById(scope.sectionId)
    .select("cycle designation bureau.chefSection")
    .populate({ path: "bureau.chefSection", select: "name telephone email" })
    .lean();
  const sectionCycle =
    sectionDoc && typeof sectionDoc === "object" && "cycle" in sectionDoc
      ? String((sectionDoc as { cycle?: string }).cycle ?? "").trim()
      : "";
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
    <GestionnaireReleveResourcesClient
      sectionSlug={scope.sectionSlug}
      sectionDesignation={scope.sectionDesignation}
      sectionCycle={sectionCycle}
      programmes={programmes}
      annees={annees}
      chefSection={chefSection}
      initialData={initialData}
      initialError={initialError}
    />
  );
}
