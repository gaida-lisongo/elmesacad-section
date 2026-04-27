import type {
  AccountServiceErrorBody,
  CreateMailAccountResponse,
  DeleteMailAccountResponse,
  ListMailAccountsResponse,
  MailAccountExistsResponse,
  MailAccountRow,
  UpdateMailAccountResponse,
} from "./types";
import type { MailServiceAudience } from "./audience";
import {
  looksLikeJwt,
  resolveMailBearerOverride,
  resolveMailAccountPasswordScheme,
  resolveMailServiceBaseUrl,
  resolveMailXApiKey,
} from "./audience";
import { MAIL_ACCOUNT_PASSWORD_MAX_LENGTH } from "./payloads";
import { getServiceJwt } from "@/lib/service-auth/getServiceJwt";
import {
  buildAdminMailAccountPayload,
  buildAgentMailAccountPayload,
  buildStudentMailAccountPayload,
  serializeAdminMailAccountForApi,
  serializeAgentMailAccountForApi,
  serializeStudentMailAccountForApi,
} from "./payloads";

async function buildMailHeaders(audience: MailServiceAudience): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const xApiKey = resolveMailXApiKey(audience);
  if (xApiKey) {
    headers["X-API-Key"] = xApiKey;
  }

  const bearerOverride = resolveMailBearerOverride(audience);
  const jwt = bearerOverride ?? (await getServiceJwt());
  if (jwt) {
    headers.Authorization = `Bearer ${jwt}`;
  }

  return headers;
}

type RawSuccess = { ok: true; [k: string]: unknown };
export type ServiceCallResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code?: string; message: string };

function clarifyMailServiceErrorMessage(raw: string): string {
  if (/Data too long for column ['"]?password['"]?/i.test(raw)) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[mail-accounts] password column too short — SQL:", raw);
    }
    return (
      "Colonne SQL password trop courte pour le hash. Sur la base du account-service : " +
      "ALTER TABLE <table> MODIFY COLUMN password VARCHAR(255) NOT NULL; " +
      "(remplacer <table> : virtual_users, mailbox, etc.). " +
      `Saisie max ${MAIL_ACCOUNT_PASSWORD_MAX_LENGTH} caracteres cote app.`
    );
  }
  return raw;
}

async function callMailAccounts<T extends RawSuccess>(
  audience: MailServiceAudience,
  method: "GET" | "POST" | "PUT" | "DELETE",
  pathAfterMailAccounts: string,
  body?: object
): Promise<ServiceCallResult<T>> {
  const base = resolveMailServiceBaseUrl(audience);
  if (!base) {
    return {
      ok: false,
      status: 0,
      message:
        "URL service mail manquante : ACCOUNT_SERVICE (ou ACCOUNT_SERVICE_* selon l’audience)",
    };
  }

  const xApiKey = resolveMailXApiKey(audience);
  if (!xApiKey) {
    return {
      ok: false,
      status: 0,
      message:
        "ACCOUNT_API_KEY manquant : definir ACCOUNT_API_KEY dans .env (X-API-Key account-service, voir README)",
    };
  }

  if (looksLikeJwt(xApiKey)) {
    return {
      ok: false,
      status: 0,
      message:
        "ACCOUNT_API_KEY ne doit pas etre un JWT : mettre la cle API statique du account-service (env du conteneur / Traefik), pas un token Mongo. Le Bearer JWT est ajoute automatiquement via getServiceJwt().",
    };
  }

  const url = `${base}/mail-accounts${pathAfterMailAccounts}`;
  const init: RequestInit = {
    method,
    headers: await buildMailHeaders(audience),
  };
  if (body !== undefined && method !== "GET" && method !== "DELETE") {
    init.body = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, cache: "no-store" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Réseau injoignable (account-service)";
    return { ok: false, status: 0, message };
  }

  const payload: unknown = await response.json().catch(() => null);

  if (
    payload &&
    typeof payload === "object" &&
    "ok" in payload &&
    (payload as { ok: unknown }).ok === false
  ) {
    const e = payload as AccountServiceErrorBody;
    const base = e.message || `Erreur account-service (HTTP ${response.status})`;
    return {
      ok: false,
      status: response.status,
      code: e.code,
      message: clarifyMailServiceErrorMessage(base),
    };
  }

  if (!response.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `HTTP ${response.status}`;
    return { ok: false, status: response.status, message: clarifyMailServiceErrorMessage(msg) };
  }

  if (!payload || typeof payload !== "object" || (payload as { ok?: unknown }).ok !== true) {
    return { ok: false, status: response.status, message: "Réponse inattendue du service mail" };
  }

  return { ok: true, status: response.status, data: payload as T };
}

async function findMailAccountIdByEmail(
  audience: MailServiceAudience,
  email: string
): Promise<{ ok: true; id: number } | { ok: false; status: number; message: string; code?: string }> {
  const normalized = email.trim().toLowerCase();
  const list = await listMailAccountsForAudience(audience);
  if (!list.ok) {
    return { ok: false, status: list.status, message: list.message, code: list.code };
  }
  const row = list.data.rows.find((r) => r.email.toLowerCase() === normalized);
  if (!row) {
    return { ok: false, status: 404, message: "Aucune boîte trouvée pour cet e-mail" };
  }
  return { ok: true, id: row.id };
}

/** Tableau de bord / opérations admin : même audience que create reset. */
export async function listMailAccounts(): Promise<ServiceCallResult<ListMailAccountsResponse>> {
  return listMailAccountsForAudience("admin");
}

export async function listMailAccountsForAudience(
  audience: MailServiceAudience
): Promise<ServiceCallResult<ListMailAccountsResponse>> {
  return callMailAccounts<ListMailAccountsResponse>(audience, "GET", "");
}

export async function mailAccountExists(
  email: string
): Promise<ServiceCallResult<MailAccountExistsResponse>> {
  return mailAccountExistsForAudience("admin", email);
}

export async function mailAccountExistsForAudience(
  audience: MailServiceAudience,
  email: string
): Promise<ServiceCallResult<MailAccountExistsResponse>> {
  const e = email.trim();
  if (!e) {
    return { ok: false, status: 0, message: "L'adresse e-mail est requise" };
  }
  const q = new URLSearchParams({ email: e });
  return callMailAccounts<MailAccountExistsResponse>(audience, "GET", `/exists?${q.toString()}`);
}

/** Alias explicites pour tests / traçabilité. */
export const mailAccountExistsAgent = (email: string) =>
  mailAccountExistsForAudience("agent", email);
export const mailAccountExistsStudent = (email: string) =>
  mailAccountExistsForAudience("student", email);

export async function createMailAccount(
  email: string,
  password: string
): Promise<ServiceCallResult<CreateMailAccountResponse>> {
  const wire = serializeAdminMailAccountForApi(buildAdminMailAccountPayload(email, password));
  return callMailAccounts<CreateMailAccountResponse>("admin", "POST", "", wire);
}

export async function createAgentMailAccount(
  email: string,
  password: string
): Promise<ServiceCallResult<CreateMailAccountResponse>> {
  const wire = serializeAgentMailAccountForApi(buildAgentMailAccountPayload(email, password));
  return callMailAccounts<CreateMailAccountResponse>("agent", "POST", "", wire);
}

export async function createStudentMailAccount(
  email: string,
  password: string
): Promise<ServiceCallResult<CreateMailAccountResponse>> {
  const wire = serializeStudentMailAccountForApi(buildStudentMailAccountPayload(email, password));
  return callMailAccounts<CreateMailAccountResponse>("student", "POST", "", wire);
}

export async function updateMailAccountById(
  id: number,
  patch: { email?: string; password?: string }
): Promise<ServiceCallResult<UpdateMailAccountResponse>> {
  if (!patch.email && !patch.password) {
    return { ok: false, status: 0, message: "email ou password requis" };
  }
  const scheme = resolveMailAccountPasswordScheme();
  const body =
    scheme !== undefined && patch.password !== undefined
      ? { ...patch, passwordScheme: scheme }
      : patch;
  return callMailAccounts<UpdateMailAccountResponse>("admin", "PUT", `/${id}`, body);
}

export async function updateMailAccount(
  email: string,
  password: string
): Promise<ServiceCallResult<UpdateMailAccountResponse>> {
  const resolved = await findMailAccountIdByEmail("admin", email);
  if (!resolved.ok) {
    return resolved;
  }
  return updateMailAccountById(resolved.id, { password });
}

export async function deleteMailAccount(
  email: string
): Promise<ServiceCallResult<DeleteMailAccountResponse>> {
  const resolved = await findMailAccountIdByEmail("admin", email);
  if (!resolved.ok) {
    return resolved;
  }
  return callMailAccounts<DeleteMailAccountResponse>("admin", "DELETE", `/${resolved.id}`);
}

export async function findMailAccountRowByEmail(
  email: string
): Promise<ServiceCallResult<{ row: MailAccountRow }>> {
  const normalized = email.trim().toLowerCase();
  const list = await listMailAccounts();
  if (!list.ok) {
    return { ok: false, status: list.status, message: list.message, code: list.code };
  }
  const row = list.data.rows.find((r) => r.email.toLowerCase() === normalized);
  if (!row) {
    return { ok: false, status: 404, message: "Aucune boîte trouvée pour cet e-mail" };
  }
  return { ok: true, status: 200, data: { row } };
}
