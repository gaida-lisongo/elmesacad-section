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

