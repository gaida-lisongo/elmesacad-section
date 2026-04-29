"use server";

import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import userManager from "@/lib/services/UserManager";
import { titulaireFetchChargesAll } from "@/lib/titulaire-service/chargesRemote";
import { AnneeModel } from "@/lib/models/Annee";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SectionModel } from "@/lib/models/Section";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import { fetchTitulaireService } from "@/lib/service-auth/upstreamFetch";

type MatiereTab = {
  id: string;
  matiereDesignation: string;
  matiereReference: string;
  programmeRef: string;
  programmeDesignation: string;
  programmeSlug: string;
  sectionSlug: string;
  uniteCode: string;
  semestreDesignation: string;
};

type AnneeCard = {
  id: string;
  designation: string;
  slug: string;
  debut: number;
  fin: number;
  status: boolean;
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

export async function loadTitulaireNotesManagerData(): Promise<{
  matiereTabs: MatiereTab[];
  annees: AnneeCard[];
}> {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "titulaire") {
    throw new Error("Accès réservé aux titulaires.");
  }

  await connectDB();
  const agent = await userManager.getUserByEmail("Agent", session.email);
  const matricule = String((agent as { matricule?: string } | null)?.matricule ?? "").trim();
  const email = String(session.email ?? "").trim();

  const chargesRes = await titulaireFetchChargesAll({
    titulaire_matricule: matricule || undefined,
    titulaire_email: email || undefined,
  });
  if (!chargesRes.ok) {
    throw new Error(`Service charges indisponible (${chargesRes.status})`);
  }

  const tabsMap = new Map<string, MatiereTab>();
  for (const row of chargesRes.items as Array<Record<string, unknown>>) {
    const matiere = (row.matiere ?? {}) as Record<string, unknown>;
    const promotion = (row.promotion ?? {}) as Record<string, unknown>;
    const unite = (row.unite ?? {}) as Record<string, unknown>;
    const programmeRef = String(promotion.reference ?? "").trim();
    const matiereRef = String(matiere.reference ?? "").trim();
    if (!programmeRef || !Types.ObjectId.isValid(programmeRef) || !matiereRef) continue;

    const prog = await ProgrammeModel.findById(new Types.ObjectId(programmeRef))
      .select("designation slug section")
      .lean();
    if (!prog?.section) continue;
    const section = await SectionModel.findById(prog.section).select("slug").lean();
    if (!section?.slug) continue;

    const key = `${programmeRef}::${matiereRef}`;
    if (tabsMap.has(key)) continue;
    tabsMap.set(key, {
      id: key,
      matiereDesignation: String(matiere.designation ?? ""),
      matiereReference: matiereRef,
      programmeRef,
      programmeDesignation: String(prog.designation ?? promotion.designation ?? ""),
      programmeSlug: String(prog.slug ?? ""),
      sectionSlug: String(section.slug ?? ""),
      uniteCode: String(unite.code_unite ?? ""),
      semestreDesignation: String(unite.semestre ?? ""),
    });
  }

  const anneesRaw = await AnneeModel.find().select("_id designation slug debut fin status").sort({ debut: -1 }).lean();
  const annees: AnneeCard[] = anneesRaw.map((a) => ({
    id: String(a._id),
    designation: String(a.designation ?? ""),
    slug: String(a.slug ?? ""),
    debut: Number(a.debut ?? 0),
    fin: Number(a.fin ?? 0),
    status: Boolean(a.status),
  }));

  return {
    matiereTabs: [...tabsMap.values()].sort((a, b) => a.matiereDesignation.localeCompare(b.matiereDesignation, "fr")),
    annees,
  };
}

export async function listParcoursForTitulaireWorkflow(input: {
  anneeSlug: string;
  sectionSlug: string;
  programmeSlug: string;
  search?: string;
}) {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "titulaire") {
    throw new Error("Accès réservé aux titulaires.");
  }
  const sp = new URLSearchParams({
    annee: String(input.anneeSlug ?? "").trim(),
    filiere: String(input.sectionSlug ?? "").trim(),
    classe: String(input.programmeSlug ?? "").trim(),
    page: "1",
    limit: "200",
  });
  if (input.search?.trim()) sp.set("search", input.search.trim());
  const upstream = await fetchEtudiantApi(`${PARCOURS_BASE_PATH}?${sp.toString()}`);
  const payload = (await upstream.json().catch(() => ({}))) as { data?: unknown[]; message?: string };
  if (!upstream.ok) throw new Error(payload.message ?? "Service parcours indisponible");
  return Array.isArray(payload.data) ? payload.data : [];
}

export type TitulaireNoteLinePayload = {
  email: string;
  matricule: string;
  studentId: string;
  studentName: string;
  semestre: { designation: string; reference: string; credit: number };
  unite: { designation: string; reference: string; code?: string; credit: number };
  matiere: { designation: string; reference: string; credit: number };
  cc?: number;
  examen?: number;
  rattrapage?: number;
  rachat?: number;
};

async function assertTitulaireSession() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "titulaire") {
    throw new Error("Accès réservé aux titulaires.");
  }
}

export async function fetchCourseNotesForTitulaire(courseRef: string) {
  await assertTitulaireSession();
  const ref = String(courseRef ?? "").trim();
  if (!ref) return [];
  const res = await fetchTitulaireService(`/notes/course/${encodeURIComponent(ref)}`, { method: "GET" });
  const payload = (await res.json().catch(() => ({}))) as { data?: unknown; message?: string };
  if (!res.ok) throw new Error(payload.message ?? "Lecture des notes impossible");
  const rows = Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return rows as unknown[];
}

export async function fetchRawNoteLinesForCourse(input: { courseRef: string; matricules?: string[] }) {
  await assertTitulaireSession();
  const ref = String(input.courseRef ?? "").trim();
  if (!ref) return [];
  const res = await fetchTitulaireService("/notes/all", { method: "GET" });
  const payload = (await res.json().catch(() => ({}))) as { data?: unknown; message?: string };
  if (!res.ok) throw new Error(payload.message ?? "Lecture des notes brutes impossible");
  const rows = (Array.isArray(payload.data) ? payload.data : Array.isArray(payload) ? payload : []) as Array<
    Record<string, unknown>
  >;
  const allowed = new Set((input.matricules ?? []).map((m) => String(m).trim().toLowerCase()).filter(Boolean));
  return rows.filter((x) => {
    const mref = String((x.matiere as Record<string, unknown> | undefined)?.reference ?? "").trim();
    if (mref !== ref) return false;
    if (allowed.size === 0) return true;
    const mat = String(x.matricule ?? "").trim().toLowerCase();
    return allowed.has(mat);
  });
}

export async function createTitulaireNoteLine(input: TitulaireNoteLinePayload) {
  await assertTitulaireSession();
  const res = await fetchTitulaireService("/notes/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!res.ok) throw new Error(payload.message ?? "Création note échouée");
  return payload.data ?? payload;
}

export async function bulkCreateTitulaireNotes(lines: TitulaireNoteLinePayload[]) {
  await assertTitulaireSession();
  const clean = (Array.isArray(lines) ? lines : []).filter(Boolean);
  if (clean.length === 0) return { count: 0 };
  const res = await fetchTitulaireService("/notes/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(clean),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string; count?: number };
  if (!res.ok) throw new Error(payload.message ?? "Import notes échoué");
  return { count: Number(payload.count ?? clean.length) };
}

export async function updateTitulaireNoteLine(noteId: string, patch: Partial<TitulaireNoteLinePayload>) {
  await assertTitulaireSession();
  const id = String(noteId ?? "").trim();
  if (!id) throw new Error("Identifiant de note manquant.");
  const res = await fetchTitulaireService(`/notes/update/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!res.ok) throw new Error(payload.message ?? "Mise à jour impossible");
  return payload.data ?? payload;
}

export async function deleteTitulaireNoteLine(noteId: string) {
  await assertTitulaireSession();
  const id = String(noteId ?? "").trim();
  if (!id) throw new Error("Identifiant de note manquant.");
  const res = await fetchTitulaireService(`/notes/delete/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? "Suppression impossible");
  }
  return { ok: true };
}

