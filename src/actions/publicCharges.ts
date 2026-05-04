"use server";

import { fetchTitulaireService } from "@/lib/service-auth/upstreamFetch";
import type { PublicSeanceCard } from "@/actions/publicSeances";
import type { PublicHeroActivity } from "@/actions/titulaireActivites";

export type ChargeDescriptorSection = {
  title: string;
  contenu: string[];
};

export type ChargeHoraireDetail = {
  id: string;
  matiere: { designation: string; reference: string };
  unite: { designation: string; code_unite: string; semestre: string };
  promotion: { designation: string; reference: string };
  titulaire: {
    name: string;
    matricule: string;
    email: string;
    telephone: string;
    disponibilite: string;
    photo?: string;
  };
  horaire: {
    jour: string;
    heure_debut: string;
    heure_fin: string;
    date_debut: string;
    date_fin: string;
  };
  status: string;
  descripteur: {
    objectif: ChargeDescriptorSection[];
    methodologie: ChargeDescriptorSection[];
    mode_evaluation: ChargeDescriptorSection[];
    penalties: ChargeDescriptorSection[];
    ressources: ChargeDescriptorSection[];
    plan_cours: ChargeDescriptorSection[];
  };
  seances: PublicSeanceCard[];
  activites: PublicHeroActivity[];
};

function pickObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function extractArray(payload: unknown, preferredKeys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = pickObject(payload);
  if (!root) return [];
  for (const key of preferredKeys) {
    const v = root[key];
    if (Array.isArray(v)) return v;
  }
  return [];
}

export async function getPublicChargeDetail(id: string): Promise<ChargeHoraireDetail | null> {
  if (!id || id === "undefined") return null;

  try {
    const [chargeRes, seancesRes, activitesRes] = await Promise.all([
      fetchTitulaireService(`/charges/${id}`, { method: "GET", cache: "no-store" }),
      fetchTitulaireService(`/seances/charge/${id}`, { method: "GET", cache: "no-store" }),
      fetchTitulaireService(`/activites/all?charge_horaire=${id}`, { method: "GET", cache: "no-store" }),
    ]);

    if (!chargeRes.ok) return null;

    const chargePayload = await chargeRes.json();
    const chargeRaw = (pickObject(chargePayload?.data) ?? pickObject(chargePayload)) as Record<string, any>;

    if (!chargeRaw) return null;

    // Map seances
    const seancesPayload = await seancesRes.json().catch(() => ({}));
    const seancesRaw = extractArray(seancesPayload, ["data", "items", "seances"]);
    const seances: PublicSeanceCard[] = seancesRaw.map((s: any) => ({
      id: s._id || s.id,
      title: s.lecon || "Séance",
      dateSeance: s.date,
      jour: s.jour,
      heureDebut: s.heure_debut,
      heureFin: s.heure_fin,
      salle: s.salle || "N/A",
      matiere: chargeRaw.matiere?.designation,
      promotion: chargeRaw.promotion?.designation,
      status: !!s.status,
    }));

    // Map activites
    const activitesPayload = await activitesRes.json().catch(() => ({}));
    const activitesRaw = extractArray(activitesPayload, ["data", "items", "activites"]);
    const activites: PublicHeroActivity[] = activitesRaw
      .filter((a: any) => a.status === "active")
      .map((a: any) => {
        const tp = Array.isArray(a.tp) ? a.tp : [];
        const qcm = Array.isArray(a.qcm) ? a.qcm : [];
        return {
          id: a._id || a.id,
          title: a.tp?.[0]?.enonce || a.qcm?.[0]?.enonce || "Activité",
          summary: `Note max ${a.note_maximale}`,
          teacher: chargeRaw.titulaire?.name,
          badge: a.categorie,
          categorie: a.categorie?.toLowerCase() as "tp" | "qcm",
          matiere: chargeRaw.matiere?.designation,
          unite: chargeRaw.unite?.designation,
          promotion: chargeRaw.promotion?.designation,
          chargeHoraireId: id,
          noteMaximale: a.note_maximale,
          publishedAt: a.createdAt,
        };
      });

    return {
      id: chargeRaw._id || chargeRaw.id,
      matiere: chargeRaw.matiere,
      unite: chargeRaw.unite,
      promotion: chargeRaw.promotion,
      titulaire: chargeRaw.titulaire,
      horaire: chargeRaw.horaire,
      status: chargeRaw.status,
      descripteur: chargeRaw.descripteur || {
        objectif: [],
        methodologie: [],
        mode_evaluation: [],
        penalties: [],
        ressources: [],
        plan_cours: [],
      },
      seances,
      activites,
    };
  } catch (error) {
    console.error("[getPublicChargeDetail] Error:", error);
    return null;
  }
}
