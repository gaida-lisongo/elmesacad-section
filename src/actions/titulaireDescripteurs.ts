"use server";

import { getSessionPayload } from "@/lib/auth/sessionServer";
import userManager from "@/lib/services/UserManager";
import { fetchTitulaireService } from "@/lib/service-auth/upstreamFetch";
import { titulaireFetchChargesAll } from "@/lib/titulaire-service/chargesRemote";

export type DescriptorSection = { title: string; contenu: string[] };
export type DescriptorKey =
  | "objectif"
  | "methodologie"
  | "mode_evaluation"
  | "penalties"
  | "ressources"
  | "plan_cours";

export type DescriptorPayload = Record<DescriptorKey, DescriptorSection[]>;

export type ChargeDescriptorItem = {
  id: string;
  label: string;
  /** Année académique affichée dans les onglets (slug, désignation ou période dérivée du créneau). */
  anneeLabel: string;
  matiereDesignation: string;
  matiereReference: string;
  programmeDesignation: string;
  programmeReference: string;
  uniteDesignation: string;
  semestreDesignation: string;
  descripteur: DescriptorPayload;
};

const DESCRIPTOR_KEYS: DescriptorKey[] = [
  "objectif",
  "methodologie",
  "mode_evaluation",
  "penalties",
  "ressources",
  "plan_cours",
];

function normalizeDescriptor(raw: unknown): DescriptorPayload {
  const src = (raw ?? {}) as Record<string, unknown>;
  const out = {} as DescriptorPayload;
  for (const k of DESCRIPTOR_KEYS) {
    const arr = Array.isArray(src[k]) ? src[k] : [];
    out[k] = arr.map((x) => {
      const obj = (x ?? {}) as Record<string, unknown>;
      return {
        title: String(obj.title ?? "").trim(),
        contenu: (Array.isArray(obj.contenu) ? obj.contenu : []).map((l) => String(l ?? "").trim()).filter(Boolean),
      };
    });
  }
  return out;
}

/** Libellé année pour distinguer plusieurs charges du même cours / même promotion. */
function extractAnneeLabel(row: Record<string, unknown>): string {
  const annee = row.annee;
  if (annee && typeof annee === "object") {
    const o = annee as Record<string, unknown>;
    const slug = String(o.slug ?? "").trim();
    if (slug) return slug;
    const des = String(o.designation ?? "").trim();
    if (des) return des;
  }
  if (typeof annee === "string" && annee.trim()) return annee.trim();

  for (const key of ["anneeAcademique", "annee_academique", "anneeSlug", "annee_slug", "academicYear"]) {
    const v = row[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const o = v as Record<string, unknown>;
      const s = String(o.slug ?? o.designation ?? "").trim();
      if (s) return s;
    }
  }

  const horaire = (row.horaire ?? {}) as Record<string, unknown>;
  return academicYearFromHoraireDates(horaire.date_debut, horaire.date_fin);
}

function academicYearFromHoraireDates(dateDebut: unknown, dateFin: unknown): string {
  const d1 = dateDebut != null ? new Date(String(dateDebut)) : null;
  if (!d1 || Number.isNaN(d1.getTime())) return "";
  const y1 = d1.getFullYear();
  const d2 = dateFin != null ? new Date(String(dateFin)) : null;
  if (!d2 || Number.isNaN(d2.getTime())) return String(y1);
  const y2 = d2.getFullYear();
  if (y1 === y2) return String(y1);
  const a = Math.min(y1, y2);
  const b = Math.max(y1, y2);
  return `${a}-${b}`;
}

async function assertTitulaire() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "titulaire") {
    throw new Error("Accès réservé aux titulaires.");
  }
  const agent = await userManager.getUserByEmail("Agent", session.email);
  return {
    matricule: String((agent as { matricule?: string } | null)?.matricule ?? "").trim(),
    email: String(session.email ?? "").trim(),
  };
}

export async function loadTitulaireDescripteursData(): Promise<{ charges: ChargeDescriptorItem[] }> {
  const auth = await assertTitulaire();
  const res = await titulaireFetchChargesAll({
    titulaire_matricule: auth.matricule || undefined,
    titulaire_email: auth.email || undefined,
  });
  if (!res.ok) throw new Error(`Service charges indisponible (${res.status})`);
  const rawCharges = (res.items as Array<Record<string, unknown>>).map((row) => {
    const matiere = (row.matiere ?? {}) as Record<string, unknown>;
    const promotion = (row.promotion ?? {}) as Record<string, unknown>;
    const unite = (row.unite ?? {}) as Record<string, unknown>;
    const id = String(row._id ?? row.id ?? "");
    const mat = String(matiere.designation ?? "Cours").trim();
    const promo = String(promotion.designation ?? "Promotion").trim();
    const anneeLabel = extractAnneeLabel(row);
    const baseLabel = anneeLabel ? `${mat} · ${promo} · ${anneeLabel}` : `${mat} · ${promo}`;
    return {
      id,
      label: baseLabel,
      anneeLabel,
      matiereDesignation: String(matiere.designation ?? ""),
      matiereReference: String(matiere.reference ?? ""),
      programmeDesignation: String(promotion.designation ?? ""),
      programmeReference: String(promotion.reference ?? ""),
      uniteDesignation: String(unite.designation ?? ""),
      semestreDesignation: String(unite.semestre ?? ""),
      descripteur: normalizeDescriptor(row.descripteur),
    } satisfies ChargeDescriptorItem;
  });
  const charges = rawCharges.filter((x) => x.id);
  const labelCount = new Map<string, number>();
  for (const c of charges) {
    labelCount.set(c.label, (labelCount.get(c.label) ?? 0) + 1);
  }
  return {
    charges: charges.map((c) => {
      if ((labelCount.get(c.label) ?? 0) <= 1) return c;
      return { ...c, label: `${c.label} · #${c.id.slice(-6)}` };
    }),
  };
}

export async function saveChargeDescripteur(input: { chargeId: string; descripteur: DescriptorPayload }) {
  await assertTitulaire();
  const id = String(input.chargeId ?? "").trim();
  if (!id) throw new Error("Charge invalide.");
  const res = await fetchTitulaireService(`/charges/update/${encodeURIComponent(id)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ descripteur: input.descripteur }),
  });
  const payload = (await res.json().catch(() => ({}))) as { message?: string; data?: unknown };
  if (!res.ok) throw new Error(payload.message ?? "Échec sauvegarde descripteur");
  return { ok: true, data: payload.data ?? payload };
}

