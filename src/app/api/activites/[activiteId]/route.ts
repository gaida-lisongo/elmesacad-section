import { NextResponse } from "next/server";
import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractActivite(payload: unknown): Record<string, unknown> | null {
  if (Array.isArray(payload)) return null;
  const root = pickObject(payload);
  if (!root) return null;
  if (root._id || root.id) return root;
  for (const key of ["data", "activite", "result", "payload"]) {
    const nested = pickObject(root[key]);
    if (nested && (nested._id || nested.id)) return nested;
  }
  return null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ activiteId: string }> }
) {
  const { activiteId: raw } = await context.params;
  const activiteId = normalizeMongoObjectIdString(String(raw ?? "").trim());
  if (!activiteId) {
    return NextResponse.json({ success: false, message: "activiteId invalide." }, { status: 400 });
  }

  const base = getTitulaireServiceBase();
  if (!base) {
    return NextResponse.json({ success: false, message: "TITULAIRE_SERVICE non configuré." }, { status: 500 });
  }

  const candidates = [
    `/activites/${encodeURIComponent(activiteId)}`,
    `/activites/get/${encodeURIComponent(activiteId)}`,
    `/activites/by-id/${encodeURIComponent(activiteId)}`,
    `/activites/all`,
  ];

  let lastError = "Activité introuvable.";
  for (const path of candidates) {
    const upstream = await fetch(`${base}${path}`, { method: "GET", cache: "no-store" });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const o = pickObject(body);
      lastError = String(o?.message ?? o?.error ?? `HTTP ${upstream.status}`);
      continue;
    }

    if (path !== "/activites/all") {
      const activity = extractActivite(body);
      if (activity) return NextResponse.json({ success: true, data: activity }, { status: 200 });
      continue;
    }

    const list = Array.isArray(body)
      ? body
      : Array.isArray((body as { data?: unknown }).data)
        ? ((body as { data?: unknown[] }).data ?? [])
        : [];
    const found = list.find((x) => {
      const o = pickObject(x);
      return String(o?._id ?? o?.id ?? "").trim() === activiteId;
    });
    if (found) return NextResponse.json({ success: true, data: found }, { status: 200 });
  }

  return NextResponse.json({ success: false, message: lastError }, { status: 404 });
}
