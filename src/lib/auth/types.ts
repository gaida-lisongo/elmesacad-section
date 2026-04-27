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

/** Habilitations liées à l’agent (collection `Authorization`). */
export type AuthAgentAuthorization = {
  id: string;
  code: string;
  designation: string;
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
  /** Chargées avec le profil (OTP + `/api/auth/me`). */
  authorizations?: AuthAgentAuthorization[];
};

export type AuthUser = AuthUserStudent | AuthUserAgent;
