import type {
  AccountServiceErrorBody,
  CreateMailAccountResponse,
  DeleteMailAccountResponse,
  ListMailAccountsResponse,
  MailAccountExistsResponse,
  UpdateMailAccountResponse,
} from "./types";

const getBaseUrl = (): string | null => {
  const url = process.env.ACCOUNT_SERVICE;
  if (!url) {
    return null;
  }
  return url.replace(/\/+$/, "");
};

const buildHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const key = process.env.ACCOUNT_SERVICE_API_KEY;
  if (key) {
    headers.Authorization = `Bearer ${key}`;
  }
  return headers;
};

type RawSuccess = { ok: true; [k: string]: unknown };
type ServiceCallResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; code?: string; message: string };

/** Sous-chemin après `/mail-accounts` (ex. `""` ou `"/exists?email=..."`). */
async function callMailAccounts<T extends RawSuccess>(
  method: "GET" | "POST" | "PUT" | "DELETE",
  pathAfterMailAccounts: string,
  body?: object
): Promise<ServiceCallResult<T>> {
  const base = getBaseUrl();
  if (!base) {
    return {
      ok: false,
      status: 0,
      message: "ACCOUNT_SERVICE manquant : définissez l'URL du microservice (ex. http://hôte:3000/)",
    };
  }
  const url = `${base}/mail-accounts${pathAfterMailAccounts}`;
  const init: RequestInit = {
    method,
    headers: buildHeaders(),
  };
  if (body !== undefined && method !== "GET") {
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

  if (payload && typeof payload === "object" && "ok" in payload && (payload as { ok: unknown }).ok === false) {
    const e = payload as AccountServiceErrorBody;
    return {
      ok: false,
      status: response.status,
      code: e.code,
      message: e.message || `Erreur account-service (HTTP ${response.status})`,
    };
  }

  if (!response.ok) {
    const msg =
      payload && typeof payload === "object" && "message" in payload
        ? String((payload as { message: unknown }).message)
        : `HTTP ${response.status}`;
    return { ok: false, status: response.status, message: msg };
  }

  if (!payload || typeof payload !== "object" || (payload as { ok?: unknown }).ok !== true) {
    return { ok: false, status: response.status, message: "Réponse inattendue du service mail" };
  }

  return { ok: true, status: response.status, data: payload as T };
}

export async function listMailAccounts(): Promise<ServiceCallResult<ListMailAccountsResponse>> {
  return callMailAccounts<ListMailAccountsResponse>("GET", "");
}

export async function mailAccountExists(
  email: string
): Promise<ServiceCallResult<MailAccountExistsResponse>> {
  const e = email.trim();
  if (!e) {
    return { ok: false, status: 0, message: "L'adresse e-mail est requise" };
  }
  const q = new URLSearchParams({ email: e });
  return callMailAccounts<MailAccountExistsResponse>("GET", `/exists?${q.toString()}`);
}

export async function createMailAccount(
  email: string,
  password: string
): Promise<ServiceCallResult<CreateMailAccountResponse>> {
  return callMailAccounts<CreateMailAccountResponse>("POST", "", { email, password });
}

export async function updateMailAccount(
  email: string,
  password: string
): Promise<ServiceCallResult<UpdateMailAccountResponse>> {
  return callMailAccounts<UpdateMailAccountResponse>("PUT", "", { email, password });
}

export async function deleteMailAccount(
  email: string
): Promise<ServiceCallResult<DeleteMailAccountResponse>> {
  return callMailAccounts<DeleteMailAccountResponse>("DELETE", "", { email });
}
