import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import type { OrganisateurBureauSectionContext } from "@/lib/section/getOrganisateurPrimaryBureauSection";

export async function getOrganisateurSujetBureauSection(
  agentSub: string
): Promise<OrganisateurBureauSectionContext | null> {
  if (!Types.ObjectId.isValid(agentSub)) return null;
  const oid = new Types.ObjectId(agentSub);
  await connectDB();
  const row = await SectionModel.findOne({
    $or: [
      { "bureau.chargeRecherche": oid },
      { "bureau.chefSection": oid },
    ],
  })
    .select("_id designation slug bureau")
    .sort({ designation: 1 })
    .lean();

  if (!row?._id) return null;
  const isChefSection = row.bureau?.chefSection ? String(row.bureau.chefSection) === agentSub : false;
  const isChargeRecherche = row.bureau?.chargeRecherche ? String(row.bureau.chargeRecherche) === agentSub : false;
  return {
    sectionId: String(row._id),
    sectionSlug: String(row.slug ?? "").trim(),
    sectionDesignation: String((row as { designation?: string }).designation ?? "").trim(),
    isChefSection,
    isChargeEnseignement: false,
    isChargeRecherche,
  };
}
