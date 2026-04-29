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
  const charges = (res.items as Array<Record<string, unknown>>).map((row) => {
    const matiere = (row.matiere ?? {}) as Record<string, unknown>;
    const promotion = (row.promotion ?? {}) as Record<string, unknown>;
    const unite = (row.unite ?? {}) as Record<string, unknown>;
    return {
      id: String(row._id ?? row.id ?? ""),
      label: `${String(matiere.designation ?? "Cours")} · ${String(promotion.designation ?? "Promotion")}`,
      matiereDesignation: String(matiere.designation ?? ""),
      matiereReference: String(matiere.reference ?? ""),
      programmeDesignation: String(promotion.designation ?? ""),
      programmeReference: String(promotion.reference ?? ""),
      uniteDesignation: String(unite.designation ?? ""),
      semestreDesignation: String(unite.semestre ?? ""),
      descripteur: normalizeDescriptor(row.descripteur),
    } satisfies ChargeDescriptorItem;
  });
  return { charges: charges.filter((x) => x.id) };
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

