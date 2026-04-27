"use server";

import * as accountClient from "./client";
import { MAIL_ACCOUNT_PASSWORD_MAX_LENGTH } from "./payloads";
import type { MailAccountRow, MailAccountsActionResult } from "./types";

const trim = (s: string) => s.trim();

function assertMailPasswordLength(password: string): string | null {
  if (password.length > MAIL_ACCOUNT_PASSWORD_MAX_LENGTH) {
    return `Mot de passe trop long (maximum ${MAIL_ACCOUNT_PASSWORD_MAX_LENGTH} caracteres pour la boite mail).`;
  }
  return null;
}

function toActionError(
  r: { message: string; code?: string }
): { success: false; error: string; code?: string } {
  return { success: false, error: r.message, code: r.code };
}

/**
 * Liste les boîtes (audience admin — tableau de bord).
 */
export async function listMailAccountsAction(): Promise<
  MailAccountsActionResult<{ rows: MailAccountRow[] }>
> {
  const result = await accountClient.listMailAccounts();
  if (!result.ok) {
    return toActionError(result);
  }
  return { success: true, data: { rows: result.data.rows } };
}

function mapCreateResult(
  result: Awaited<ReturnType<typeof accountClient.createAgentMailAccount>>
): MailAccountsActionResult<{ account: MailAccountRow; status: string }> {
  if (!result.ok) {
    return toActionError(result);
  }
  const account: MailAccountRow = {
    id: result.data.id,
    email: result.data.user.email,
    domain_id: 0,
    domain_name: result.data.user.domain,
  };
  return {
    success: true,
    data: { account, status: result.data.status },
  };
}

/** Inscription wizard — agent (payload + audience `agent`). */
export async function createAgentMailboxAction(
  email: string,
  password: string
): Promise<MailAccountsActionResult<{ account: MailAccountRow; status: string }>> {
  const e = trim(email);
  const p = password;
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }
  if (!p) {
    return { success: false, error: "Le mot de passe est requis" };
  }
  return mapCreateResult(await accountClient.createAgentMailAccount(e, p));
}

/** Inscription wizard — étudiant (payload + audience `student`). */
export async function createStudentMailboxAction(
  email: string,
  password: string
): Promise<MailAccountsActionResult<{ account: MailAccountRow; status: string }>> {
  const e = trim(email);
  const p = password;
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }
  if (!p) {
    return { success: false, error: "Le mot de passe est requis" };
  }
  const lenErr = assertMailPasswordLength(p);
  if (lenErr) {
    return { success: false, error: lenErr };
  }
  return mapCreateResult(await accountClient.createStudentMailAccount(e, p));
}

/**
 * Création côté admin (dashboard) — audience `admin`.
 */
export async function createMailAccountAction(
  email: string,
  password: string
): Promise<MailAccountsActionResult<{ account: MailAccountRow; status: string }>> {
  const e = trim(email);
  const p = password;
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }
  if (!p) {
    return { success: false, error: "Le mot de passe est requis" };
  }
  const lenErr = assertMailPasswordLength(p);
  if (lenErr) {
    return { success: false, error: lenErr };
  }
  return mapCreateResult(await accountClient.createMailAccount(e, p));
}

export async function updateMailAccountAction(
  email: string,
  password: string
): Promise<MailAccountsActionResult<{ updated: boolean }>> {
  const e = trim(email);
  const p = password;
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }
  if (!p) {
    return { success: false, error: "Le mot de passe est requis" };
  }
  const lenErr = assertMailPasswordLength(p);
  if (lenErr) {
    return { success: false, error: lenErr };
  }

  const result = await accountClient.updateMailAccount(e, p);
  if (!result.ok) {
    return toActionError(result);
  }
  return { success: true, data: { updated: result.data.updated } };
}

export async function deleteMailAccountAction(
  email: string
): Promise<MailAccountsActionResult<{ deleted: boolean }>> {
  const e = trim(email);
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }

  const result = await accountClient.deleteMailAccount(e);
  if (!result.ok) {
    return toActionError(result);
  }
  return { success: true, data: { deleted: result.data.deleted } };
}

export async function agentMailboxExistsAction(
  email: string
): Promise<MailAccountsActionResult<{ exists: boolean; email: string }>> {
  const e = trim(email);
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }
  const result = await accountClient.mailAccountExistsAgent(e);
  if (!result.ok) {
    return toActionError(result);
  }
  return {
    success: true,
    data: { exists: result.data.exists, email: result.data.email },
  };
}

export async function studentMailboxExistsAction(
  email: string
): Promise<MailAccountsActionResult<{ exists: boolean; email: string }>> {
  const e = trim(email);
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }
  const result = await accountClient.mailAccountExistsStudent(e);
  if (!result.ok) {
    return toActionError(result);
  }
  return {
    success: true,
    data: { exists: result.data.exists, email: result.data.email },
  };
}

/** Existence — audience admin (comportement historique). */
export async function mailAccountExistsAction(
  email: string
): Promise<MailAccountsActionResult<{ exists: boolean; email: string }>> {
  const e = trim(email);
  if (!e) {
    return { success: false, error: "L’adresse e-mail est requise" };
  }

  const result = await accountClient.mailAccountExists(e);
  if (!result.ok) {
    return toActionError(result);
  }
  return {
    success: true,
    data: { exists: result.data.exists, email: result.data.email },
  };
}
