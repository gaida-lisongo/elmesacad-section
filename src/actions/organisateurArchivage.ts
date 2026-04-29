"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { fetchTitulaireService } from "@/lib/service-auth/upstreamFetch";

type ListInput = {
  anneeSlug: string;
  sectionSlug: string;
  programmeSlug: string;
  search?: string;
  page?: number;
  limit?: number;
};

function resolveParcoursPath(): string {
  const raw = String(process.env.ETUDIANT_PARCOURS_BASE_PATH ?? "").trim();
  const fallback = "/parcours";
  if (!raw) return fallback;

  let value = raw;
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      value = `${u.pathname}${u.search}`;
    } catch {
      return fallback;
    }
  }
  if (!value.startsWith("/")) value = `/${value}`;
  value = value.replace(/\/+$/, "");
  if (/\/parcours$/i.test(value)) return value;
  if (/\/api$/i.test(value)) return "/parcours";
  return `${value}/parcours`;
}

const PARCOURS_BASE_PATH = resolveParcoursPath();

export async function listParcoursForArchivage(input: ListInput) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    throw new Error("Accès réservé aux organisateurs.");
  }

  const sp = new URLSearchParams({
    annee: String(input.anneeSlug ?? "").trim(),
    filiere: String(input.sectionSlug ?? "").trim(),
    classe: String(input.programmeSlug ?? "").trim(),
    page: String(Math.max(1, input.page ?? 1)),
    limit: String(Math.max(1, Math.min(200, input.limit ?? 50))),
  });
  if (input.search?.trim()) sp.set("search", input.search.trim());

  const upstream = await fetchEtudiantApi(`${PARCOURS_BASE_PATH}?${sp.toString()}`);
  const payload = (await upstream.json().catch(() => ({}))) as {
    data?: unknown[];
    meta?: { total?: number; page?: number; limit?: number };
    message?: string;
  };
  if (!upstream.ok) {
    throw new Error(payload.message ?? "Service parcours indisponible");
  }
  return {
    data: Array.isArray(payload.data) ? payload.data : [],
    total: typeof payload.meta?.total === "number" ? payload.meta.total : 0,
    page: typeof payload.meta?.page === "number" ? payload.meta.page : 1,
    limit: typeof payload.meta?.limit === "number" ? payload.meta.limit : 50,
  };
}

export type NotePayloadLine = {
  email: string;
  matricule: string;
  studentId: string;
  studentName: string;
  semestre: { designation: string; reference: string; credit: number };
  unite: { designation: string; reference: string; code?: string; credit: number };
  matiere: { designation: string; reference: string; credit: number };
  cc: number;
  examen: number;
  rattrapage: number;
  rachat: number;
};

export async function sendRattrapageNotesBatch(input: {
  batchIndex: number;
  totalBatches: number;
  lines: NotePayloadLine[];
}) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    throw new Error("Accès réservé aux organisateurs.");
  }
  if (!Array.isArray(input.lines) || input.lines.length === 0) {
    return { ok: true, count: 0, batchIndex: input.batchIndex, totalBatches: input.totalBatches };
  }
  const res = await fetchTitulaireService("/notes/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input.lines),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string; count?: number; notes?: unknown[] };
  if (!res.ok) {
    throw new Error(payload.message ?? `Échec envoi lot ${input.batchIndex}/${input.totalBatches}`);
  }
  return {
    ok: true,
    count: Number(payload.count ?? input.lines.length),
    batchIndex: input.batchIndex,
    totalBatches: input.totalBatches,
  };
}

export async function fetchStructuredNotesByMatricules(matricules: string[]) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur") {
    throw new Error("Accès réservé aux organisateurs.");
  }
  const clean = (Array.isArray(matricules) ? matricules : [])
    .map((m) => String(m ?? "").trim())
    .filter(Boolean);
  const unique = [...new Set(clean)];
  const result: Record<string, { ok: boolean; status: number; data: unknown | null; message?: string }> = {};
  for (const matricule of unique) {
    const res = await fetchTitulaireService(`/notes/student/${encodeURIComponent(matricule)}`, { method: "GET" });
    const payload = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
    console.log("[ARCHIVAGE][NOTES_BY_MATRICULE]", {
      matricule,
      status: res.status,
      ok: res.ok,
      payload,
    });
    result[matricule] = {
      ok: res.ok,
      status: res.status,
      data: res.ok ? (payload.data ?? payload) : null,
      message: payload.message,
    };
  }
  return result;
}

