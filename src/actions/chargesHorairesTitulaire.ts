"use server";

import { Types } from "mongoose";
import { revalidatePath } from "next/cache";
import { EMPTY_CHARGE_DESCRIPT } from "@/lib/charges/chargePayloadDefaults";
import { gateOrganisateurSectionBureau } from "@/lib/auth/gateOrganisateurSectionBureau";
import {
  gateSectionChargesHoraires,
} from "@/lib/auth/gateSectionChargesHoraires";
import { MatiereModel } from "@/lib/models/Matiere";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { connectDB } from "@/lib/services/connectedDB";
import {
  titulaireCreateCharge,
  titulaireDeleteCharge,
  titulaireFetchChargeById,
  titulaireFetchChargesAll,
  titulaireUpdateCharge,
} from "@/lib/titulaire-service/chargesRemote";

export type ChargesActionResult<T> = { ok: true; data: T } | { ok: false; message: string };

async function messageFromGateResponse(res: Response): Promise<string> {
  try {
    const j = (await res.json()) as { message?: string };
    return typeof j.message === "string" ? j.message : "Accès refusé";
  } catch {
    return "Accès refusé";
  }
}

function sortSemestresByOrderThenCreated<
  T extends { order?: number; createdAt?: Date },
>(a: T, b: T): number {
  const oa = a.order ?? 0;
  const ob = b.order ?? 0;
  if (oa !== ob) return oa - ob;
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ca - cb;
}

/**
 * Arborescence programmes → semestres → unités (membre du bureau).
 * Les semestres sont résolus via `Semestre.programme` (comme l’API section), pas seulement via le tableau `Programme.semestres`.
 */
export async function getSectionChargeStructureAction(
  sectionId: string
): Promise<ChargesActionResult<unknown[]>> {
  const gate = await gateOrganisateurSectionBureau(sectionId);
  if (!gate.ok) {
    return { ok: false, message: await messageFromGateResponse(gate.response) };
  }
  if (!Types.ObjectId.isValid(sectionId)) {
    return { ok: false, message: "Section invalide" };
  }
  try {
    await connectDB();
    void SemestreModel;
    void UniteEnseignementModel;
    void MatiereModel;
    const sectionOid = new Types.ObjectId(sectionId);
    const programmes = await ProgrammeModel.find({ section: sectionOid })
      .select("designation slug credits")
      .sort({ designation: 1 })
      .lean();

    const programmeIds = programmes.map((p) => p._id);
    const semByProgramme = new Map<string, unknown[]>();

    if (programmeIds.length > 0) {
      const allSemestres = await SemestreModel.find({
        programme: { $in: programmeIds },
        filiere: { $exists: false },
      })
        .populate({
          path: "unites",
          model: "UniteEnseignement",
          options: { sort: { designation: 1 } },
          populate: { path: "matieres", model: "Matiere", options: { sort: { designation: 1 } } },
        })
        .lean();

      for (const s of allSemestres) {
        const pref = (s as { programme?: Types.ObjectId }).programme;
        if (!pref) continue;
        const pidKey = String(pref);
        const list = semByProgramme.get(pidKey);
        if (list) list.push(s);
        else semByProgramme.set(pidKey, [s]);
      }
      for (const list of semByProgramme.values()) {
        list.sort((a, b) =>
          sortSemestresByOrderThenCreated(
            a as { order?: number; createdAt?: Date },
            b as { order?: number; createdAt?: Date }
          )
        );
      }
    }

    const data = programmes.map((p) => ({
      ...p,
      semestres: semByProgramme.get(String(p._id)) ?? [],
    }));
    return { ok: true, data };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

/** Contexte unité + matières pour la page charge-matière. */
export async function getUniteChargeContextAction(
  programmeId: string,
  uniteId: string
): Promise<ChargesActionResult<Record<string, unknown>>> {
  if (!Types.ObjectId.isValid(programmeId) || !Types.ObjectId.isValid(uniteId)) {
    return { ok: false, message: "Programme ou unité invalide" };
  }
  try {
    await connectDB();
    const pid = new Types.ObjectId(programmeId);
    const uid = new Types.ObjectId(uniteId);
    const programme = await ProgrammeModel.findById(pid).select("designation slug section").lean();
    if (!programme) return { ok: false, message: "Programme introuvable" };
    if (!programme.section) return { ok: false, message: "Programme sans section" };

    const unite = await UniteEnseignementModel.findById(uid).populate("matieres").lean();
    if (!unite) return { ok: false, message: "Unité introuvable" };

    const sem = await SemestreModel.findOne({
      unites: uid,
    })
      .select("designation order programme")
      .lean();

    const matieres = (Array.isArray(unite.matieres) ? unite.matieres : []) as Array<{
      _id: Types.ObjectId;
      designation?: string;
      credits?: number;
      code?: string;
    }>;

    return {
      ok: true,
      data: {
        sectionId: String(programme.section),
        programmeId: String(programme._id),
        programmeDesignation: programme.designation ?? "",
        programmeSlug: programme.slug ?? "",
        semestreDesignation: sem?.designation ?? "",
        unite: {
          _id: String(unite._id),
          designation: unite.designation,
          code: unite.code,
          credits: unite.credits,
        },
        matieres: matieres
          .sort((a, b) => String(a.designation ?? "").localeCompare(String(b.designation ?? "")))
          .map((m) => ({
            _id: String(m._id),
            designation: m.designation ?? "",
            credits: Number(m.credits ?? 0),
            code: m.code ?? "",
          })),
      },
    };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function listChargesHorairesAction(
  sectionId: string,
  filters?: { code_unite?: string; matiere_reference?: string }
): Promise<ChargesActionResult<unknown[]>> {
  try {
    void sectionId;
    const r = await titulaireFetchChargesAll(filters);
    if (!r.ok) {
      return {
        ok: false,
        message: `Service charges (${r.status}) indisponible ou erreur`,
      };
    }
    return { ok: true, data: r.items };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function getChargeHoraireAction(
  sectionId: string,
  chargeId: string
): Promise<ChargesActionResult<unknown>> {
  const gate = await gateSectionChargesHoraires(sectionId);
  if (!gate.ok) {
    return { ok: false, message: await messageFromGateResponse(gate.response) };
  }
  try {
    const r = await titulaireFetchChargeById(chargeId);
    if (!r.ok) {
      return { ok: false, message: "Charge introuvable ou service indisponible" };
    }
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function createChargeHoraireAction(body: {
  programmeId: string;
  sectionId: string;
  uniteId: string;
  matiereId: string;
  semestreDesignation?: string;
  promotion?: { designation: string; reference: string };
  titulaire: Record<string, unknown>;
  horaire: Record<string, unknown>;
  status?: "pending" | "finish" | "no";
}): Promise<ChargesActionResult<unknown>> {
  const { programmeId, sectionId, uniteId, matiereId, titulaire, horaire } = body;
  if (!programmeId || !sectionId || !uniteId || !matiereId) {
    return { ok: false, message: "programmeId, sectionId, uniteId et matiereId requis" };
  }
  if (!titulaire || typeof titulaire !== "object" || !horaire || typeof horaire !== "object") {
    return { ok: false, message: "titulaire et horaire requis" };
  }

  try {
    await connectDB();
    if (!Types.ObjectId.isValid(programmeId) || !Types.ObjectId.isValid(matiereId) || !Types.ObjectId.isValid(uniteId)) {
      return { ok: false, message: "Identifiants invalides" };
    }
    const matiere = await MatiereModel.findOne({
      _id: new Types.ObjectId(matiereId),
      unite: new Types.ObjectId(uniteId),
    }).lean();
    if (!matiere) return { ok: false, message: "Matière introuvable pour cette unité" };

    const unite = await UniteEnseignementModel.findById(uniteId).lean();
    if (!unite) return { ok: false, message: "Unité introuvable" };

    const sem = await SemestreModel.findOne({
      programme: new Types.ObjectId(programmeId),
      unites: new Types.ObjectId(uniteId),
    }).lean();

    const prom = body.promotion;
    const payload = {
      matiere: {
        designation: matiere.designation,
        reference: String(matiere._id),
      },
      unite: {
        designation: unite.designation,
        code_unite: unite.code,
        semestre: body.semestreDesignation?.trim() || sem?.designation || "—",
      },
      promotion: {
        designation: (prom?.designation ?? "").trim() || "—",
        reference: String(programmeId),
      },
      titulaire,
      horaire,
      status: body.status ?? "no",
      descripteur: EMPTY_CHARGE_DESCRIPT,
    };

    const r = await titulaireCreateCharge(payload);
    if (!r.ok) {
      return { ok: false, message: "Création refusée par le service des charges" };
    }
    revalidatePath("/dashboard");
    revalidatePath(`/charge-matiere/${programmeId}_${uniteId}`);
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function updateChargeHoraireAction(
  sectionId: string,
  chargeId: string,
  patch: Record<string, unknown>
): Promise<ChargesActionResult<unknown>> {
  const gate = await gateSectionChargesHoraires(sectionId);
  if (!gate.ok) {
    return { ok: false, message: await messageFromGateResponse(gate.response) };
  }
  try {
    const r = await titulaireUpdateCharge(chargeId, patch);
    if (!r.ok) {
      return { ok: false, message: "Mise à jour refusée" };
    }
    revalidatePath("/dashboard");
    return { ok: true, data: r.data };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}

export async function deleteChargeHoraireAction(
  sectionId: string,
  chargeId: string
): Promise<ChargesActionResult<null>> {
  const gate = await gateSectionChargesHoraires(sectionId);
  if (!gate.ok) {
    return { ok: false, message: await messageFromGateResponse(gate.response) };
  }
  try {
    const r = await titulaireDeleteCharge(chargeId);
    if (r.status === 404) {
      return { ok: false, message: "Charge introuvable" };
    }
    if (!r.ok) {
      return { ok: false, message: "Suppression refusée" };
    }
    revalidatePath("/dashboard");
    return { ok: true, data: null };
  } catch (e) {
    return { ok: false, message: (e as Error).message };
  }
}
