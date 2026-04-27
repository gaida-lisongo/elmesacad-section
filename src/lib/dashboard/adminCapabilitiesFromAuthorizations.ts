import type {
  DashboardAdminCapabilities,
  DashboardAgentAuthorization,
  DashboardRole,
} from "@/lib/dashboard/types";

/**
 * Codes d’habilitation (champ `Authorization.code` en base).
 * Correspondances métier :
 * - SA : composants filières (CRUD)
 * - MD : composant comptes utilisateurs (création / réinitialisation)
 * - WM : composants recharges (détail / liste mensuelle côté API)
 */
export const DASHBOARD_AUTH_CODES = ["SA", "MD", "WM"] as const;
export type DashboardAuthCode = (typeof DASHBOARD_AUTH_CODES)[number];

function normalizeAuthCode(code: string): string {
  return code.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
}

export function hasDashboardAuthCode(
  list: DashboardAgentAuthorization[],
  expected: DashboardAuthCode
): boolean {
  return list.some((a) => normalizeAuthCode(a.code) === expected);
}

/**
 * Titulaire / étudiant : pas de modules dashboard par autorisation (géré ailleurs).
 * Admin sans aucune ligne `Authorization` : accès complet SA / MD / WM (comportement historique).
 * Admin avec au moins une autorisation : droits strictement selon les codes présents.
 */
export function resolveAdminCapabilities(
  role: DashboardRole,
  list: DashboardAgentAuthorization[]
): DashboardAdminCapabilities {
  if (role !== "admin") {
    return {
      canManageFilieres: false,
      canManageUserAccounts: false,
      canReadTransactions: false,
    };
  }

  if (list.length === 0) {
    return {
      canManageFilieres: true,
      canManageUserAccounts: true,
      canReadTransactions: true,
    };
  }

  return {
    canManageFilieres: hasDashboardAuthCode(list, "SA"),
    canManageUserAccounts: hasDashboardAuthCode(list, "MD"),
    canReadTransactions: hasDashboardAuthCode(list, "WM"),
  };
}
