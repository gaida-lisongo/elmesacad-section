import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

export type OrganisateurBureauSectionContext = {
  sectionId: string;
  sectionSlug: string;
  sectionDesignation: string;
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
    ],
  })
    .select("_id designation slug")
    .sort({ designation: 1 })
    .lean();

  if (!row?._id) return null;
  return {
    sectionId: String(row._id),
    sectionSlug: String(row.slug ?? "").trim(),
    sectionDesignation: String((row as { designation?: string }).designation ?? "").trim(),
  };
}
