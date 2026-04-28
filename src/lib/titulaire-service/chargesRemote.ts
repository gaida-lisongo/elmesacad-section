import {
  fetchTitulaireService,
  getTitulaireServiceBase,
} from "@/lib/service-auth/upstreamFetch";

export type ChargeHorairePayload = Record<string, unknown>;

async function parseJsonBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray((data as { data?: unknown }).data)) {
    return (data as { data: unknown[] }).data;
  }
  return [];
}

export async function titulaireFetchChargesAll(
  filters?: Record<string, string | undefined>
): Promise<{ ok: boolean; status: number; items: unknown[]; raw?: unknown }> {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(filters ?? {})) {
    const val = (v ?? "").trim();
    if (val) sp.set(k, val);
  }
  const qs = sp.toString();
  const path = `/charges/all${qs ? `?${qs}` : ""}`;
  const base = getTitulaireServiceBase() ?? "";
  const url = `${base}${path}`;
  console.log("[TITULAIRE_SERVICE] GET", url);
  const res = await fetchTitulaireService(path, { method: "GET" });
  const raw = await parseJsonBody(res);
  console.log("[TITULAIRE_SERVICE] RESPONSE", raw);
  const items = normalizeList(raw);
  return { ok: res.ok, status: res.status, items, raw };
}

export async function titulaireFetchChargeById(
  id: string
): Promise<{ ok: boolean; status: number; data: unknown | null }> {
  const res = await fetchTitulaireService(`/charges/${encodeURIComponent(id)}`, { method: "GET" });
  const data = (await parseJsonBody(res)) as unknown | null;
  return { ok: res.ok, status: res.status, data };
}

export async function titulaireCreateCharge(
  payload: ChargeHorairePayload
): Promise<{ ok: boolean; status: number; data: unknown | null }> {
  const res = await fetchTitulaireService("/charges/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await parseJsonBody(res)) as unknown | null;
  return { ok: res.ok, status: res.status, data };
}

export async function titulaireUpdateCharge(
  id: string,
  payload: ChargeHorairePayload
): Promise<{ ok: boolean; status: number; data: unknown | null }> {
  const res = await fetchTitulaireService(`/charges/update/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = (await parseJsonBody(res)) as unknown | null;
  return { ok: res.ok, status: res.status, data };
}

export async function titulaireDeleteCharge(id: string): Promise<{ ok: boolean; status: number }> {
  const res = await fetchTitulaireService(`/charges/delete/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  return { ok: res.ok, status: res.status };
}
