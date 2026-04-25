/**
 * Représentation minimaliste côté client (Zustand) après session JWT.
 */
export type AuthUserStudent = {
  kind: "student";
  id: string;
  name: string;
  email: string;
  matricule: string;
  photo: string;
  cycle: string;
  /** Libellé affiché (menu, header) */
  accountLabel: "Étudiant";
};

export type AuthUserAgent = {
  kind: "agent";
  id: string;
  name: string;
  email: string;
  matricule: string;
  photo: string;
  role: string;
  accountLabel: string;
};

export type AuthUser = AuthUserStudent | AuthUserAgent;
