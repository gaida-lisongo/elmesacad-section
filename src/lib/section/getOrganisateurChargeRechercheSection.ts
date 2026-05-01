import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import type { OrganisateurBureauSectionContext } from "@/lib/section/getOrganisateurPrimaryBureauSection";

/**
 * Section dont l’organisateur est désigné **chargé de recherche** au bureau.
 * Si plusieurs, on prend la première par ordre de désignation (comportement « primaire »).
 */
export async function getOrganisateurChargeRechercheSection(
  agentSub: string
): Promise<OrganisateurBureauSectionContext | null> {
  if (!Types.ObjectId.isValid(agentSub)) return null;
  const oid = new Types.ObjectId(agentSub);
  await connectDB();
  const row = await SectionModel.findOne({ "bureau.chargeRecherche": oid })
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
