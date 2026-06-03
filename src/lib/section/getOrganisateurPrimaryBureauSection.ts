import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

export type OrganisateurBureauSectionContext = {
  sectionId: string;
  sectionSlug: string;
  sectionDesignation: string;
  isChefSection: boolean;
  isChargeEnseignement: boolean;
  isChargeRecherche: boolean;
  isSecrétaire: boolean;
};

/**
 * Première section (tri désignation) dont l’agent est membre du bureau
 * (chef, chargé d’enseignement ou chargé de recherche).
 * Aligné sur `GET /api/my-sections/bureau`.
 */
export async function getOrganisateurPrimaryBureauSection(
  agentSub: string
): Promise<OrganisateurBureauSectionContext | null> {
  if (!Types.ObjectId.isValid(agentSub)) return null;
  const oid = new Types.ObjectId(agentSub);
  await connectDB();
  const row = await SectionModel.findOne({
    $or: [
      { "bureau.chefSection": oid },
      { "bureau.chargeEnseignement": oid },
      { "bureau.chargeRecherche": oid },
      { "bureau.secretaire": oid },
    ],
  })
    .select("_id designation slug bureau")
    .sort({ designation: 1 })
    .lean();

  if (!row?._id) return null;

  console.log("getOrganisateurPrimaryBureauSection =>", row);

  const isChefSection = row.bureau?.chefSection ? String(row.bureau.chefSection) === agentSub : false;
  const isChargeEnseignement =
    row.bureau?.chargeEnseignement ? String(row.bureau.chargeEnseignement) === agentSub : false;
  const isChargeRecherche =
    row.bureau?.chargeRecherche ? String(row.bureau.chargeRecherche) === agentSub : false;
  const isSecrétaire =
    row.bureau?.secretaire ? String(row.bureau.secretaire) === agentSub : false;

  return {
    sectionId: String(row._id),
    sectionSlug: String(row.slug ?? "").trim(),
    sectionDesignation: String((row as { designation?: string }).designation ?? "").trim(),
    isChefSection,
    isChargeEnseignement,
    isChargeRecherche,
    isSecrétaire,
  };
}
