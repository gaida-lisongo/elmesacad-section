import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { ProgrammeModel } from "@/lib/models/Programme";
import { fetchEtudesSectionResourcesGrouped } from "@/lib/product/fetchEtudesSectionResourcesGrouped";
import type { ResourceProductVM } from "@/lib/product/loadProductPageData";

type JuryMemberOption = {
  id: string;
  nom: string;
  email: string;
  matricule: string;
  role: "president" | "secretaire" | "membre";
};

function collectJuryMembers(jr: unknown): JuryMemberOption[] {
  if (!jr || typeof jr !== "object") return [];
  const j = jr as Record<string, unknown>;
  const out: JuryMemberOption[] = [];
  const seen = new Set<string>();
  const push = (raw: unknown, role: JuryMemberOption["role"]) => {
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
  const roleOrder: Record<JuryMemberOption["role"], number> = {
    president: 0,
    secretaire: 1,
    membre: 2,
  };
  out.sort((x, y) => roleOrder[x.role] - roleOrder[y.role] || x.nom.localeCompare(y.nom));
  return out;
}

export type ChargeRechercheTablePayload = {
  programmes: { slug: string; designation: string; credits: number }[];
  juryCoursMembers: JuryMemberOption[];
  juryRechercheMembers: JuryMemberOption[];
  chefSection: { name: string; telephone: string; email: string };
  sujets: ResourceProductVM[];
  stages: ResourceProductVM[];
};

export async function loadOrganisateurCrTableData(
  sectionId: string,
  sectionSlug: string
): Promise<ChargeRechercheTablePayload> {
  await connectDB();

  const programmeRows = await ProgrammeModel.find({ section: new Types.ObjectId(sectionId) })
    .select("slug designation credits")
    .sort({ designation: 1 })
    .lean();
  const programmes = programmeRows.map((p) => ({
    slug: String((p as { slug?: string }).slug ?? "").trim(),
    designation: String((p as { designation?: string }).designation ?? "").trim(),
    credits: Number((p as { credits?: number }).credits ?? 0),
  }));

  const sectionDoc = await SectionModel.findById(sectionId)
    .select("jury bureau.chefSection")
    .populate([
      { path: "jury.cours.president", select: "name email matricule" },
      { path: "jury.cours.secretaire", select: "name email matricule" },
      { path: "jury.cours.membres", select: "name email matricule" },
      { path: "jury.recherche.president", select: "name email matricule" },
      { path: "jury.recherche.secretaire", select: "name email matricule" },
      { path: "jury.recherche.membres", select: "name email matricule" },
      { path: "bureau.chefSection", select: "name telephone email" },
    ])
    .lean();

  const docData = sectionDoc as { jury?: { cours?: unknown; recherche?: unknown }; bureau?: { chefSection?: unknown } } | null;

  const juryCoursMembers = collectJuryMembers(docData?.jury?.cours);
  const juryRechercheMembers = collectJuryMembers(docData?.jury?.recherche);

  const chefRaw = docData?.bureau?.chefSection;
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

  const grouped = await fetchEtudesSectionResourcesGrouped(sectionSlug);

  return {
    programmes,
    juryCoursMembers,
    juryRechercheMembers,
    chefSection,
    sujets: grouped.sujets,
    stages: grouped.stages,
  };
}