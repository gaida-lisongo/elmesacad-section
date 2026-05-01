import { getOrganisateurChargeEnseignementSection } from "@/lib/section/getOrganisateurChargeEnseignementSection";
import { getOrganisateurChargeRechercheSection } from "@/lib/section/getOrganisateurChargeRechercheSection";
import type { OrganisateurBureauSectionContext } from "@/lib/section/getOrganisateurPrimaryBureauSection";

/**
 * Section pour la gestion des **ressources stages** : même logique métier que les sujets
 * (chargé de recherche), avec maintien de l’accès **chargé d’enseignement** lorsqu’il est
 * le seul habilité sur le bureau.
 *
 * Priorité au **chargé de recherche** lorsque les deux affectations coexistent sur des sections.
 */
export async function getOrganisateurStageBureauSection(
  agentSub: string
): Promise<OrganisateurBureauSectionContext | null> {
  return (
    (await getOrganisateurChargeRechercheSection(agentSub)) ??
    (await getOrganisateurChargeEnseignementSection(agentSub))
  );
}
