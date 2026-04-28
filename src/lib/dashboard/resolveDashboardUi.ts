import type {
  DashboardAgentAuthorization,
  DashboardRole,
  DashboardUiConfig,
} from "@/lib/dashboard/types";

const AGENT_STAFF_ROLES: DashboardRole[] = ["titulaire", "organisateur", "gestionnaire"];

function isAgentStaffRole(role: DashboardRole): boolean {
  return AGENT_STAFF_ROLES.includes(role);
}

function staffSubtitle(role: DashboardRole): string | undefined {
  switch (role) {
    case "titulaire":
      return "Activités pédagogiques, notes et ressources.";
    case "organisateur":
      return "Programmes, tableau de bord section (bureau), activités et archivage.";
    case "gestionnaire":
      return "Enrollements, fiches de validation, relevés et laboratoires.";
    default:
      return undefined;
  }
}

/**
 * Présentation du tableau de bord par type de compte (alignée sur `userFloatingMenu`).
 * `authorizations` sert déjà à afficher les habilitations ; on pourra conditionner des blocs par `code` ensuite.
 */
export function resolveDashboardUi(
  role: DashboardRole,
  authorizations: DashboardAgentAuthorization[]
): DashboardUiConfig {
  if (role === "admin") {
    /** Graphique récap. recharges : tout admin. Le détail (liste / API) reste sous code WM côté vue. */
    return {
      subtitle: "Vue d’ensemble de la plateforme.",
      showMetricsRow: true,
      showRechargesChart: true,
      anneesMode: "crud",
      usersTableMode: "admin",
    };
  }

  if (role === "student") {
    return {
      showMetricsRow: false,
      showRechargesChart: false,
      anneesMode: "hidden",
      usersTableMode: "hidden",
    };
  }

  if (role === "titulaire") {
    return {
      subtitle: staffSubtitle(role),
      showMetricsRow: true,
      showRechargesChart: false,
      anneesMode: "readonly",
      usersTableMode: "hidden",
    };
  }

  if (isAgentStaffRole(role)) {
    return {
      subtitle: staffSubtitle(role),
      showMetricsRow: true,
      showRechargesChart: false,
      anneesMode: "readonly",
      usersTableMode: "readonly",
    };
  }

  return {
    showMetricsRow: true,
    showRechargesChart: false,
    anneesMode: "readonly",
    usersTableMode: "readonly",
  };
}

export function dashboardInfoMessage(role: DashboardRole): string | undefined {
  if (role === "admin") return undefined;
  if (role === "student") {
    return "Espace étudiant : le tableau de bord dédié sera enrichi prochainement.";
  }
  if (role === "titulaire") {
    return "Espace titulaire : les indicateurs métier (TP, QCM, notes) seront branchés ici progressivement.";
  }
  if (role === "organisateur") {
    return "Espace organisateur : le suivi bureau (enseignement, recherche) est sur « Tableau de bord section ». Le bloc tableau ci‑dessous s’adapte à votre habilitation (CE : charges horaires par programme ; autres : aperçu des comptes en lecture seule).";
  }
  if (role === "gestionnaire") {
    return "Espace gestionnaire : la table parcours est pilotée par votre habilitation locale (appariteur / secrétaire) et l’année académique active.";
  }
  return undefined;
}

export function agentHasAuthorizationCode(
  authorizations: DashboardAgentAuthorization[],
  code: string
): boolean {
  return authorizations.some((a) => a.code === code);
}
