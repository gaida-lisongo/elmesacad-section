import { Types } from "mongoose";
import { SectionModel } from "@/lib/models/Section";

export type GestionnaireScope = {
  sectionId: string;
  sectionDesignation: string;
  sectionSlug: string;
  isAppariteur: boolean;
  isSecretaire: boolean;
  isChefSection?: boolean;
};

/**
 * Résout la section locale d'un gestionnaire et ses habilitations locales
 * (`gestionnaires.appariteur` / `gestionnaires.secretaire`).
 */
export async function resolveGestionnaireScope(agentId: string): Promise<GestionnaireScope | null> {
  if (!Types.ObjectId.isValid(agentId)) return null;
  const oid = new Types.ObjectId(agentId);
  const section = await SectionModel.findOne({
    $or: [{ "gestionnaires.appariteur": oid }, { "gestionnaires.secretaire": oid }, { "bureau.chefSection": oid }],
  })
    .select("_id designation slug gestionnaires bureau")
    .lean();
  if (!section) return null;

  const g = (section as unknown as { gestionnaires?: { appariteur?: unknown; secretaire?: unknown } }).gestionnaires;
  const isAppariteur = g?.appariteur != null && String(g.appariteur) === agentId;
  const isSecretaire = g?.secretaire != null && String(g.secretaire) === agentId;
  const isChefSection = section?.bureau?.chefSection ? String(section.bureau.chefSection) === agentId : false;
  if (!isAppariteur && !isSecretaire && !isChefSection) return null;

  return {
    sectionId: String((section as { _id: unknown })._id),
    sectionDesignation: String((section as { designation?: unknown }).designation ?? ""),
    sectionSlug: String((section as { slug?: unknown }).slug ?? ""),
    isAppariteur,
    isSecretaire,
    isChefSection,
  };
}
