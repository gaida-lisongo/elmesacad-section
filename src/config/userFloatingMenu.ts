import type { AdminMenuItem } from "@/components/UserFloatingMenu/types";
import type { AuthUser } from "@/lib/auth/types";

/**
 * Cartographie **menu flottant** par type de compte.
 * Vous ajustez uniquement ce fichier : entrées, chemins, sous-menus, par profil.
 *
 * - `student` : compte **Étudiant** (`user.kind === "student"`).
 * - `agent`   : clés = valeur du champ `role` en base (ex. `admin`, `gestionnaire`…). Ajoutez une clé
 *   par rôle existant. Si le rôle n’est pas mappé, on utilise `agentFallback`.
 * - `agentFallback` : menu agent par défaut quand le rôle n’a pas d’entrée dédiée.
 */
export const userFloatingMenu: {
  student: AdminMenuItem[];
  agent: Partial<Record<string, AdminMenuItem[]>>;
  agentFallback: AdminMenuItem[];
} = {
  student: [
    { item: "Tableau de bord", path: "/dashboard" },
    { item: "Macarons", path: "student/macarons" },
    { item: "Documents", path: "#", subMenu: [
      { item: "Relevés de cotes", path: "/student/releves" },
      { item: "Bulletins de notes", path: "/student/bulletins" },
      { item: "Fiche de Validation", path: "/student/fiche-validation" },      
    ]},
    { item: "Activités", path: "#", subMenu: [
      { item: "TP", path: "/student/tp" },
      { item: "QCM", path: "/student/qcm" },
      { item: "Laboratoires", path: "/student/laboratoires" },
    ]},
    { item: "Dépots", path: "/student/depots" },
  ],
  agent: {
    admin: [
      { item: "Dashboard", path: "/dashboard" },
      { item: "Agents", path: "/agents" },
      { item: "Etudiants", path: "/etudiants" },
      { item: "Sections", path: "/sections" },
      { item: "Tickets", path: "/tickets" },
    ],
    titulaire: [
      { item: "Tableau de bord", path: "/dashboard" },
      { item: "Descripteurs", path: "/titulaire/descripteurs"},
      { item: "Présences", path: "/titulaire/presences"},
      { item: "Activités", path: "#", subMenu: [
        { item: "TP", path: "/titulaire/tp" },
        { item: "QCM", path: "/titulaire/qcm" },
      ]},
      { item: "Notes", path: "/titulaire/notes" },
    ],
    organisateur: [
      { item: "Tableau de bord", path: "/dashboard" },
      { item: "Programmes", path: "/section/programmes" },
      { item: "Activités", path: "#", subMenu: [
        { item: "TP", path: "/section/tp" },
        { item: "QCM", path: "/section/qcm" }
      ]},
      { item: "Autorisations", path: "/section/autorisations" },
      { item: "Archivage", path: "/section/archivage" },
    ],
    gestionnaire: [
      { item: "Tableau de bord", path: "/dashboard" },
      { item: "Enrollements", path: "/section/enrollements" },
      { item: "Fiches de validation", path: "/section/fiches-validation" },
      { item: "Relevés de cotes", path: "/section/releves" },
      { item: "Laboratoires", path: "/section/laboratoires" },
    ],
  },
  agentFallback: [
  ],
};

/**
 * Résout les entrées de menu en fonction de l’utilisateur connecté (Zustand / session).
 * Le libellé du **bouton** (type de compte) reste `user.accountLabel` côté store.
 */
export function getFloatingMenuForUser(user: AuthUser): AdminMenuItem[] {
  if (user.kind === "student") {
    return userFloatingMenu.student;
  }
  const byRole = userFloatingMenu.agent[user.role];
  if (byRole && byRole.length > 0) {
    return byRole;
  }
  return userFloatingMenu.agentFallback;
}
