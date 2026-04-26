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
    { item: "Etudiants", path: "/etudiants" },
    { item: "Sections", path: "/sections" },
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
      { item: "Activités", path: "#", subMenu: [
        { item: "TP", path: "/activites/tp" },
        { item: "QCM", path: "/activites/qcm" },
      ]},
      { item: "Notes", path: "/notes" },
      { item: "Recources", path: "/recources" },
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
