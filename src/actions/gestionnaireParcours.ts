"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";

function resolveParcoursPath(): string {
  const raw = String(process.env.ETUDIANT_PARCOURS_BASE_PATH ?? "").trim();
  const fallback = "/parcours";
  if (!raw) return fallback;

  let value = raw;
  // Accepte une URL complète dans l'env mais convertit en path relatif.
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

const ALLOWED_STATUS = new Set(["inscrit", "suspendu", "abandon", "diplômé"]);

function withJson(init: RequestInit, body: unknown): RequestInit {
  return {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    body: JSON.stringify(body),
  };
}

async function assertGestionnaireSession() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    throw new Error("Accès réservé aux gestionnaires.");
  }
  return session;
}

async function resolveGestionnaireRights() {
  const session = await assertGestionnaireSession();
  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope) {
    throw new Error("Aucune section locale trouvée pour ce gestionnaire.");
  }
  return {
    canEditPersonal: scope.isAppariteur || scope.isSecretaire,
    canUpdateStatus: scope.isSecretaire,
  };
}

export async function listParcoursStudentService(input: {
  anneeSlug: string;
  filiereSlug: string;
  classeSlug?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  await assertGestionnaireSession();
  const sp = new URLSearchParams({
    annee: input.anneeSlug.trim(),
    filiere: input.filiereSlug.trim(),
    page: String(Math.max(1, input.page ?? 1)),
    limit: String(Math.max(1, Math.min(200, input.limit ?? 10))),
  });
  if (input.classeSlug?.trim()) sp.set("classe", input.classeSlug.trim());
  if (input.search?.trim()) sp.set("search", input.search.trim());
  if (input.status?.trim() && ALLOWED_STATUS.has(input.status.trim())) sp.set("status", input.status.trim());

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
    limit: typeof payload.meta?.limit === "number" ? payload.meta.limit : 10,
  };
}

export async function createParcoursBulkStudentService(records: unknown[]) {
  const rights = await resolveGestionnaireRights();
  if (!rights.canEditPersonal) throw new Error("Action réservée à l'appariteur/secrétaire.");
  if (!Array.isArray(records) || records.length === 0) throw new Error("Aucune donnée à créer.");
  const upstream = await fetchEtudiantApi(PARCOURS_BASE_PATH, withJson({ method: "POST" }, records));
  const rawText = await upstream.text().catch(() => "");
  let payload: Record<string, unknown> = {};
  try {
    payload = rawText ? (JSON.parse(rawText) as Record<string, unknown>) : {};
  } catch {
    payload = {};
  }
  if (!upstream.ok) {
    const message =
      (typeof payload.message === "string" && payload.message) ||
      (typeof payload.error === "string" && payload.error) ||
      (typeof payload.details === "string" && payload.details) ||
      (rawText ? `Erreur service étudiant (${upstream.status}): ${rawText.slice(0, 600)}` : "") ||
      `Création bulk impossible (${upstream.status})`;
    throw new Error(message);
  }
  return payload.data ?? null;
}

export async function patchParcoursBulkStudentService(updates: Array<{ _id: string; status: string }>) {
  const rights = await resolveGestionnaireRights();
  if (!rights.canUpdateStatus) throw new Error("Action réservée au secrétaire.");
  const clean = updates
    .map((u) => ({ _id: String(u._id ?? "").trim(), status: String(u.status ?? "").trim() }))
    .filter((u) => u._id && ALLOWED_STATUS.has(u.status));
  if (clean.length === 0) throw new Error("Aucune mise à jour valide.");
  const upstream = await fetchEtudiantApi(PARCOURS_BASE_PATH, withJson({ method: "PATCH" }, clean));
  const payload = (await upstream.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!upstream.ok) throw new Error(payload.message ?? "Mise à jour bulk impossible");
  return payload.data ?? null;
}

export async function deleteParcoursBulkStudentService(ids: string[]) {
  const rights = await resolveGestionnaireRights();
  if (!rights.canEditPersonal) throw new Error("Action réservée à l'appariteur/secrétaire.");
  const clean = (Array.isArray(ids) ? ids : []).map((id) => String(id).trim()).filter(Boolean);
  if (clean.length === 0) throw new Error("Aucun id valide.");
  const upstream = await fetchEtudiantApi(PARCOURS_BASE_PATH, withJson({ method: "DELETE" }, { ids: clean }));
  const payload = (await upstream.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!upstream.ok) throw new Error(payload.message ?? "Suppression bulk impossible");
  return payload.data ?? null;
}

export async function updateParcoursStudentService(input: {
  id: string;
  student?: {
    email?: string;
    matricule?: string;
    sexe?: string;
    nomComplet?: string;
    photo?: string;
    nationalite?: string;
    date_naissance?: string;
    lieu_naissance?: string;
  };
  status?: string;
}) {
  const rights = await resolveGestionnaireRights();
  const id = String(input.id ?? "").trim();
  if (!id) throw new Error("Identifiant parcours requis.");

  const patch: Record<string, unknown> = { _id: id };

  if (input.student) {
    if (!rights.canEditPersonal) {
      throw new Error("Modification des informations personnelles non autorisée.");
    }
    patch.student = input.student;
  }

  if (input.status != null) {
    const nextStatus = String(input.status).trim();
    if (!ALLOWED_STATUS.has(nextStatus)) throw new Error("Statut invalide.");
    if (!rights.canUpdateStatus) {
      throw new Error("Seul le secrétaire peut modifier le statut d'inscription.");
    }
    patch.status = nextStatus;
  }

  if (!patch.student && patch.status == null) {
    throw new Error("Aucune modification à appliquer.");
  }

  const upstream = await fetchEtudiantApi(PARCOURS_BASE_PATH, withJson({ method: "PATCH" }, [patch]));
  const payload = (await upstream.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!upstream.ok) throw new Error(payload.message ?? "Mise à jour individuelle impossible");
  return payload.data ?? null;
}
