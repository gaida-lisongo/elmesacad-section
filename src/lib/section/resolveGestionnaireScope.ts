import { Types } from "mongoose";
import { SectionModel } from "@/lib/models/Section";

export type GestionnaireScope = {
  sectionId: string;
  sectionDesignation: string;
  sectionSlug: string;
  isAppariteur: boolean;
  isSecretaire: boolean;
  isOperateurSaisie: boolean;
  isChefSection?: boolean;
};

/**
 * Résout la section locale d'un gestionnaire et ses habilitations locales
 * (`gestionnaires.appariteur` / `gestionnaires.operateurSaisie` / `bureau.secretaire`).
 */
export async function resolveGestionnaireScope(agentId: string): Promise<GestionnaireScope | null> {
  if (!Types.ObjectId.isValid(agentId)) return null;
  const oid = new Types.ObjectId(agentId);
  const section = await SectionModel.findOne({
    $or: [
      { "gestionnaires.appariteur": oid },
      { "gestionnaires.operateurSaisie": oid },
      { "bureau.secretaire": oid },
      { "bureau.chefSection": oid },
    ],
  })
    .select("_id designation slug gestionnaires bureau")
    .lean();
  if (!section) return null;

  const g = (section as unknown as { gestionnaires?: { appariteur?: unknown; operateurSaisie?: unknown } }).gestionnaires;
  const isAppariteur = g?.appariteur != null && String(g.appariteur) === agentId;
  const isOperateurSaisie = g?.operateurSaisie != null && String(g.operateurSaisie) === agentId;
  const isSecretaire = section?.bureau?.secretaire != null && String(section.bureau.secretaire) === agentId;
  const isChefSection = section?.bureau?.chefSection ? String(section.bureau.chefSection) === agentId : false;
  if (!isAppariteur && !isSecretaire && !isOperateurSaisie && !isChefSection) return null;

  return {
    sectionId: String((section as { _id: unknown })._id),
    sectionDesignation: String((section as { designation?: unknown }).designation ?? ""),
    sectionSlug: String((section as { slug?: unknown }).slug ?? ""),
    isAppariteur,
    isSecretaire,
    isOperateurSaisie,
    isChefSection,
  };
}
