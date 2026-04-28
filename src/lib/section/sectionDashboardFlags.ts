import type { DashboardAgentAuthorization } from "@/lib/dashboard/types";
import type { SectionDoc } from "@/lib/models/Section";

/**
 * Codes d’autorisation Mongo (à créer côté admin) qui étendent les droits bureau.
 * Complètent le rôle : chargé de recherche / chargé d’enseignement / chef de section.
 */
export const AUTH_SECTION_PROTOCOLES_RECHERCHE = "SPR";
/** Chargé de l’enseignement — gestion des charges horaires (dashboard + section). */
export const AUTH_CHARGE_ENSEIGNEMENT_CE = "CE";
/** @deprecated Alias historique ; préférer CE */
export const AUTH_SECTION_CHARGES_HORAIRES = "SCH";
export const AUTH_SECTION_VENTES = "SVN";

export type SectionBureauHat = "chefSection" | "chargeEnseignement" | "chargeRecherche";

export type SectionDashboardFlags = {
  inBureau: boolean;
  bureauHats: SectionBureauHat[];
  canViewAvancementEnseignement: boolean;
  canViewAvancementRecherche: boolean;
  canManageGestionnaires: boolean;
  canManageProtocolesRecherche: boolean;
  canManageChargesHoraires: boolean;
  canManageVentes: boolean;
};

const HAT_LABELS: Record<SectionBureauHat, string> = {
  chefSection: "Chef de section",
  chargeEnseignement: "Chargé d’enseignement",
  chargeRecherche: "Chargé de recherche",
};

export function sectionBureauHatLabels(hats: SectionBureauHat[]): string[] {
  return hats.map((h) => HAT_LABELS[h]);
}

/**
 * Droits effectifs sur le dashboard section : bureau + codes d’autorisation.
 */
export function resolveSectionDashboardFlags(
  agentId: string,
  bureau: SectionDoc["bureau"] | undefined | null,
  authorizations: Pick<DashboardAgentAuthorization, "code">[]
): SectionDashboardFlags {
  const codes = new Set(authorizations.map((a) => a.code));

  const bureauHats: SectionBureauHat[] = [];
  if (bureau?.chefSection && String(bureau.chefSection) === agentId) bureauHats.push("chefSection");
  if (bureau?.chargeEnseignement && String(bureau.chargeEnseignement) === agentId) {
    bureauHats.push("chargeEnseignement");
  }
  if (bureau?.chargeRecherche && String(bureau.chargeRecherche) === agentId) {
    bureauHats.push("chargeRecherche");
  }

  const inBureau = bureauHats.length > 0;
  const isChef = bureauHats.includes("chefSection");
  const isEns = bureauHats.includes("chargeEnseignement");
  const isRech = bureauHats.includes("chargeRecherche");

  return {
    inBureau,
    bureauHats,
    canViewAvancementEnseignement: inBureau,
    canViewAvancementRecherche: inBureau,
    canManageGestionnaires: inBureau,
    canManageProtocolesRecherche: isRech || codes.has(AUTH_SECTION_PROTOCOLES_RECHERCHE),
    canManageChargesHoraires:
      isEns ||
      codes.has(AUTH_CHARGE_ENSEIGNEMENT_CE) ||
      codes.has(AUTH_SECTION_CHARGES_HORAIRES),
    canManageVentes: isChef || codes.has(AUTH_SECTION_VENTES),
  };
}
