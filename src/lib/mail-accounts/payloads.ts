/**
 * Payloads typés par profil — à adapter quand l’API étendra le corps POST.
 * `serialize*ForApi` produit l’objet réellement envoyé en JSON.
 */

import { resolveMailAccountPasswordScheme } from "./audience";

/** Limite de saisie côté app (compatible bcrypt ; MD5-CRYPT accepte des mots de passe plus courts en pratique). */
export const MAIL_ACCOUNT_PASSWORD_MAX_LENGTH = 72;

export type AgentMailAccountCreatePayload = {
  email: string;
  password: string;
  /** Métadonnée applicative (non envoyée tant que serialize ne l’inclut pas). */
  kind: "agent";
};

export type StudentMailAccountCreatePayload = {
  email: string;
  password: string;
  kind: "student";
};

export type AdminMailAccountCreatePayload = {
  email: string;
  password: string;
  kind: "admin";
};

export function buildAgentMailAccountPayload(
  email: string,
  password: string
): AgentMailAccountCreatePayload {
  return {
    email: email.trim().toLowerCase(),
    password,
    kind: "agent",
  };
}

export function buildStudentMailAccountPayload(
  email: string,
  password: string
): StudentMailAccountCreatePayload {
  return {
    email: email.trim().toLowerCase(),
    password,
    kind: "student",
  };
}

export function buildAdminMailAccountPayload(
  email: string,
  password: string
): AdminMailAccountCreatePayload {
  return {
    email: email.trim().toLowerCase(),
    password,
    kind: "admin",
  };
}

/** Corps minimal supporté aujourd’hui par POST /mail-accounts. */
export type MailAccountWireCreateBody = {
  email: string;
  password: string;
  /** Présent si MAIL_ACCOUNT_PASSWORD_SCHEME / DOVECOT_PASSWORD_SCHEME est défini (ex. MD5-CRYPT). */
  passwordScheme?: string;
};

function withPasswordScheme(body: MailAccountWireCreateBody): MailAccountWireCreateBody {
  const scheme = resolveMailAccountPasswordScheme();
  if (!scheme) {
    return body;
  }
  return { ...body, passwordScheme: scheme };
}

/**
 * Agent — modifiez ce corps pour vos tests (ex. champs supplémentaires acceptés par le service).
 */
export function serializeAgentMailAccountForApi(
  p: AgentMailAccountCreatePayload
): MailAccountWireCreateBody {
  return withPasswordScheme({ email: p.email, password: p.password });
}

/**
 * Étudiant — fork dédié pour expérimentation (même forme wire par défaut).
 */
export function serializeStudentMailAccountForApi(
  p: StudentMailAccountCreatePayload
): MailAccountWireCreateBody {
  return withPasswordScheme({ email: p.email, password: p.password });
}

export function serializeAdminMailAccountForApi(
  p: AdminMailAccountCreatePayload
): MailAccountWireCreateBody {
  return withPasswordScheme({ email: p.email, password: p.password });
}
