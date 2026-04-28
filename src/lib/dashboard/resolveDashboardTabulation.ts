import type {
  DashboardAdminCapabilities,
  DashboardAgentAuthorization,
  DashboardRole,
  DashboardTableData,
  DashboardUiConfig,
} from "@/lib/dashboard/types";

/**
 * Capacités d’affichage du bloc « tabulation » du dashboard (un seul rendu actif à la fois).
 * Approche explicite `canXXX` pour admin, organisateur, gestionnaire, titulaire, étudiant.
 */
export type DashboardTabulationCapabilities = {
  /** L’article encadré (titre + contenu) est affiché. Faux si `usersTableMode === "hidden"` ou admin sans droit de voir la section. */
  canShowTabulationArticle: boolean;

  /** Organisateur avec payload CE (`tableData.chargesHoraires`) — prioritaire sur les autres tableaux. */
  canRenderTabulationChargesHoraires: boolean;

  /** Tableau paginé admin (`AdminUserTableBlock`). Rôle admin + `usersTableMode === "admin"`, hors charges. */
  canRenderTabulationAdminUsers: boolean;

  /** Tableau utilisateurs lecture seule. Organisateur (non-CE), gestionnaire, etc. */
  canRenderTabulationReadonlyUsers: boolean;

  /** Admin : la section liste utilisateurs est visible (historique : admin sans auth Mongo = tout ; avec auth = MD requis). */
  canAdminAccessUsersTableSection: boolean;

  /** Organisateur : habilitation CE reflétée par la présence de `chargesHoraires` côté données. */
  canOrganisateurShowChargesHorairesTabulation: boolean;

  /** Admin : tableau paginé avec filtres (équivalent à `canRenderTabulationAdminUsers`). */
  canAdminRenderUsersTabulation: boolean;

  /** Organisateur (sans CE ou hors payload) : aperçu utilisateurs en lecture seule. */
  canOrganisateurRenderReadonlyTabulation: boolean;

  /** Gestionnaire : aperçu utilisateurs en lecture seule. */
  canGestionnaireRenderReadonlyTabulation: boolean;

  /** Titulaire : `usersTableMode` actuel = hidden — prêt si la config change. */
  canTitulaireRenderReadonlyTabulation: boolean;

  /** Étudiant : bloc tabulation utilisateurs (hidden en prod actuelle). */
  canStudentRenderTabulationBlock: boolean;
};

const DEFAULT_ADMIN_CAPS: DashboardAdminCapabilities = {
  canManageFilieres: false,
  canManageUserAccounts: false,
  canReadTransactions: false,
};

export function resolveDashboardTabulationCaps(
  role: DashboardRole,
  ui: DashboardUiConfig,
  tableData: DashboardTableData,
  agentAuthorizations: DashboardAgentAuthorization[],
  adminCapabilities: DashboardAdminCapabilities = DEFAULT_ADMIN_CAPS
): DashboardTabulationCapabilities {
  const chargesPayload = tableData.chargesHoraires ?? null;

  const canAdminAccessUsersTableSection =
    role !== "admin" ||
    agentAuthorizations.length === 0 ||
    adminCapabilities.canManageUserAccounts;

  const canShowTabulationArticle =
    ui.usersTableMode !== "hidden" && canAdminAccessUsersTableSection;

  const canOrganisateurShowChargesHorairesTabulation =
    role === "organisateur" && chargesPayload != null;

  const canRenderTabulationChargesHoraires =
    canShowTabulationArticle && canOrganisateurShowChargesHorairesTabulation;

  const canRenderTabulationAdminUsers =
    canShowTabulationArticle &&
    !canRenderTabulationChargesHoraires &&
    ui.usersTableMode === "admin";

  const canRenderTabulationReadonlyUsers =
    canShowTabulationArticle &&
    !canRenderTabulationChargesHoraires &&
    ui.usersTableMode === "readonly";

  const canAdminRenderUsersTabulation = canRenderTabulationAdminUsers;

  const canOrganisateurRenderReadonlyTabulation =
    role === "organisateur" && canRenderTabulationReadonlyUsers;

  const canGestionnaireRenderReadonlyTabulation =
    role === "gestionnaire" && canRenderTabulationReadonlyUsers;

  const canTitulaireRenderReadonlyTabulation =
    role === "titulaire" && canRenderTabulationReadonlyUsers;

  const canStudentRenderTabulationBlock = role === "student" && canShowTabulationArticle;

  return {
    canShowTabulationArticle,
    canRenderTabulationChargesHoraires,
    canRenderTabulationAdminUsers,
    canRenderTabulationReadonlyUsers,
    canAdminAccessUsersTableSection,
    canOrganisateurShowChargesHorairesTabulation,
    canAdminRenderUsersTabulation,
    canOrganisateurRenderReadonlyTabulation,
    canGestionnaireRenderReadonlyTabulation,
    canTitulaireRenderReadonlyTabulation,
    canStudentRenderTabulationBlock,
  };
}

export function dashboardTabulationTitle(
  role: DashboardRole,
  caps: DashboardTabulationCapabilities
): string {
  if (!caps.canShowTabulationArticle) return "";
  if (caps.canRenderTabulationChargesHoraires) return "Charges horaires";
  if (role === "admin") return "Comptes utilisateurs";
  return "Utilisateurs";
}
