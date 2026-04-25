"use server";

import * as accountClient from "./client";
import type { MailAccountRow, MailAccountsActionResult } from "./types";

const trim = (s: string) => s.trim();

function toActionError(
  r: { message: string; code?: string }
): { success: false; error: string; code?: string } {
  return { success: false, error: r.message, code: r.code };
}

/**
 * Liste les comptes mail (email + maildir) exposés par le microservice account-service (GET /mail-accounts).
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

/**
 * Crée un compte Dovecot côté serveur mail (POST /mail-accounts). Le mot de passe est hashé côté service.
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

  const result = await accountClient.createMailAccount(e, p);
  if (!result.ok) {
    return toActionError(result);
  }
  return {
    success: true,
    data: { account: result.data.account, status: result.data.status },
  };
}

/**
 * Met à jour le mot de passe d’un compte existant (PUT /mail-accounts).
 */
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

  const result = await accountClient.updateMailAccount(e, p);
  if (!result.ok) {
    return toActionError(result);
  }
  return { success: true, data: { updated: result.data.updated } };
}

/**
 * Supprime le compte en base (DELETE /mail-accounts) pour l’e-mail indiqué.
 */
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

/**
 * Vérifie si un compte mail existe déjà (GET /mail-accounts/exists?email=...).
 */
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
