import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { getOrganisateurChargeRechercheSection } from "@/lib/section/getOrganisateurChargeRechercheSection";
import {
  listOrganisateurSujetResourcesAction,
  type SujetResourceRow,
} from "@/actions/organisateurSujetResources";
import { connectDB } from "@/lib/services/connectedDB";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import OrganisateurSujetResourcesClient from "./OrganisateurSujetResourcesClient";

export type JuryRechercheMemberOption = {
  id: string;
  nom: string;
  email: string;
  matricule: string;
  role: "president" | "secretaire" | "membre";
};

function collectJuryRechercheMembers(jr: unknown): JuryRechercheMemberOption[] {
  if (!jr || typeof jr !== "object") return [];
  const j = jr as Record<string, unknown>;
  const out: JuryRechercheMemberOption[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown, role: JuryRechercheMemberOption["role"]) => {
    if (!raw || typeof raw !== "object" || !("_id" in raw)) return;
    const a = raw as { _id: { toString(): string }; name?: string; email?: string; matricule?: string };
    const id = String(a._id);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({
      id,
      nom: String(a.name ?? "").trim(),
      email: String(a.email ?? "").trim(),
      matricule: String(a.matricule ?? "").trim(),
      role,
    });
  };
  push(j.president, "president");
  push(j.secretaire, "secretaire");
  const membres = j.membres;
  if (Array.isArray(membres)) {
    for (const m of membres) push(m, "membre");
  }
  const roleOrder: Record<JuryRechercheMemberOption["role"], number> = {
    president: 0,
    secretaire: 1,
    membre: 2,
  };
  out.sort((x, y) => roleOrder[x.role] - roleOrder[y.role] || x.nom.localeCompare(y.nom));
  return out;
}

export const metadata: Metadata = {
  title: "Ressources sujets | INBTP",
};

export default async function OrganisateurRessourcesSujetsPage() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    redirect("/dashboard");
  }

  const sectionCtx = await getOrganisateurChargeRechercheSection(session.sub);
  if (!sectionCtx) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50/80 p-6 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-semibold">Accès réservé au chargé de recherche</p>
        <p className="mt-2 text-amber-900/90 dark:text-amber-100/90">
          Vous devez être désigné comme <strong>chargé de recherche</strong> du bureau d&apos;une section pour gérer les
          ressources sujets. Rôle actuel : organisateur sans cette affectation sur la section.
        </p>
      </div>
    );
  }

  let initialData: { rows: SujetResourceRow[]; total: number; page: number; limit: number } = {
    rows: [],
    total: 0,
    page: 1,
    limit: 10,
  };
  let initialError: string | undefined;
  try {
    initialData = await listOrganisateurSujetResourcesAction({
      sectionSlug: sectionCtx.sectionSlug,
      page: 1,
      limit: 10,
      search: "",
    });
  } catch (e) {
    initialError = (e as Error).message;
  }

  await connectDB();
  const programmeRows = await ProgrammeModel.find({ section: new Types.ObjectId(sectionCtx.sectionId) })
    .select("slug designation credits")
    .sort({ designation: 1 })
    .lean();
  const programmes = programmeRows.map((p) => ({
    slug: String((p as { slug?: string }).slug ?? "").trim(),
    designation: String((p as { designation?: string }).designation ?? "").trim(),
    credits: Number((p as { credits?: number }).credits ?? 0),
  }));

  const sectionDoc = await SectionModel.findById(sectionCtx.sectionId)
    .select("jury.recherche bureau.chefSection")
    .populate([
      { path: "jury.recherche.president", select: "name email matricule" },
      { path: "jury.recherche.secretaire", select: "name email matricule" },
      { path: "jury.recherche.membres", select: "name email matricule" },
      { path: "bureau.chefSection", select: "name telephone email" },
    ])
    .lean();
  const docRec =
    sectionDoc && typeof sectionDoc === "object" && "jury" in sectionDoc
      ? (sectionDoc as { jury?: { recherche?: unknown } }).jury?.recherche
      : undefined;
  const juryRechercheMembers = collectJuryRechercheMembers(docRec);
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
    <OrganisateurSujetResourcesClient
      sectionSlug={sectionCtx.sectionSlug}
      sectionDesignation={sectionCtx.sectionDesignation}
      programmes={programmes}
      juryRechercheMembers={juryRechercheMembers}
      chefSection={chefSection}
      initialData={initialData}
      initialError={initialError}
    />
  );
}