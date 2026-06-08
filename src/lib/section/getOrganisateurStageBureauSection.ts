import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { getOrganisateurChargeEnseignementSection } from "@/lib/section/getOrganisateurChargeEnseignementSection";
import { getOrganisateurChargeRechercheSection } from "@/lib/section/getOrganisateurChargeRechercheSection";
import type { OrganisateurBureauSectionContext } from "@/lib/section/getOrganisateurPrimaryBureauSection";

/**
 * Section pour la gestion des **ressources stages**.
 * Priorité au **chargé de recherche** puis **chargé d'enseignement**,
 * et enfin **chef de section** (boss).
 */
export async function getOrganisateurStageBureauSection(
  agentSub: string
): Promise<OrganisateurBureauSectionContext | null> {
  const fromCharge =
    (await getOrganisateurChargeRechercheSection(agentSub)) ??
    (await getOrganisateurChargeEnseignementSection(agentSub));
  if (fromCharge) return fromCharge;

  if (!Types.ObjectId.isValid(agentSub)) return null;
  const oid = new Types.ObjectId(agentSub);
  await connectDB();
  const row = await SectionModel.findOne({ "bureau.chefSection": oid })
    .select("_id designation slug bureau")
    .sort({ designation: 1 })
    .lean();
  if (!row?._id) return null;
  return {
    sectionId: String(row._id),
    sectionSlug: String(row.slug ?? "").trim(),
    sectionDesignation: String((row as { designation?: string }).designation ?? "").trim(),
    isChefSection: true,
    isChargeEnseignement: false,
    isChargeRecherche: false,
    isSecretaire: false,
  };
}
