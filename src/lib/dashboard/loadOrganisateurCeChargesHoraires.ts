import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { MatiereModel } from "@/lib/models/Matiere";
import { ProgrammeModel } from "@/lib/models/Programme";
import { SemestreModel } from "@/lib/models/Semestre";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { getOrganisateurPrimaryBureauSection } from "@/lib/section/getOrganisateurPrimaryBureauSection";
import type {
  OrganisateurCeChargeRow,
  OrganisateurCeChargesHorairesPayload,
} from "@/lib/dashboard/types";

/** Même règle que `GET .../programmes/[programmeId]/semestres` : semestres dont `programme` est renseigné (parcours section), pas filière. */
type SemestreLeanWithUnites = {
  _id: Types.ObjectId;
  programme?: Types.ObjectId;
  designation?: string;
  order?: number;
  createdAt?: Date;
  unites?: Array<{ _id: Types.ObjectId; designation?: string; code?: string }>;
};

function sortSemestres(a: SemestreLeanWithUnites, b: SemestreLeanWithUnites): number {
  const oa = a.order ?? 0;
  const ob = b.order ?? 0;
  if (oa !== ob) return oa - ob;
  const ca = a.createdAt ? new Date(a.createdAt).getTime() : 0;
  const cb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
  return ca - cb;
}

function emptyPayload(): OrganisateurCeChargesHorairesPayload {
  return {
    sectionId: "",
    sectionSlug: "",
    sectionDesignation: "",
    programmes: [],
    rows: [],
  };
}

/**
 * Une seule section d’attache (première trouvée si plusieurs — idéalement une seule en base).
 * Programmes + lignes unités pour le filtre « programme actif » côté client.
 */
export async function loadOrganisateurCeChargesHoraires(
  agentSub: string
): Promise<OrganisateurCeChargesHorairesPayload> {
  if (!Types.ObjectId.isValid(agentSub)) return emptyPayload();

  const ctx = await getOrganisateurPrimaryBureauSection(agentSub);
  if (!ctx) return emptyPayload();

  await connectDB();
  void SemestreModel;
  void UniteEnseignementModel;
  void MatiereModel;

  const secId = new Types.ObjectId(ctx.sectionId);
  const programmes = await ProgrammeModel.find({ section: secId })
    .select("_id designation credits")
    .sort({ designation: 1 })
    .lean();

  const programmeOptions = programmes.map((p) => ({
    _id: String(p._id),
    designation: (p as { designation?: string }).designation ?? "",
    credits: Number((p as { credits?: number }).credits ?? 0),
  }));

  const rows: OrganisateurCeChargeRow[] = [];

  const programmeIds = programmes.map((p) => (p as { _id: Types.ObjectId })._id);
  const semByProgramme = new Map<string, SemestreLeanWithUnites[]>();

  if (programmeIds.length > 0) {
    const allSemestres = (await SemestreModel.find({
      programme: { $in: programmeIds },
      filiere: { $exists: false },
    })
      .populate({
        path: "unites",
        model: "UniteEnseignement",
        options: { sort: { designation: 1 } },
      })
      .lean()) as SemestreLeanWithUnites[];

    for (const s of allSemestres) {
      const pref = s.programme;
      if (!pref) continue;
      const pidKey = String(pref);
      const list = semByProgramme.get(pidKey);
      if (list) list.push(s);
      else semByProgramme.set(pidKey, [s]);
    }
    for (const list of semByProgramme.values()) {
      list.sort(sortSemestres);
    }
  }

  for (const p of programmes) {
    const pDoc = p as { _id: Types.ObjectId; designation?: string };
    const pid = String(pDoc._id);
    const semestres = semByProgramme.get(pid) ?? [];

    for (const s of semestres) {
      const sid = String(s._id);
      const unites = (s.unites ?? []) as Array<{
        _id: Types.ObjectId;
        designation?: string;
        code?: string;
      }>;
      for (const u of unites) {
        rows.push({
          key: `${String(ctx.sectionId)}-${pid}-${sid}-${String(u._id)}`,
          programmeId: pid,
          sectionId: String(ctx.sectionId),
          sectionDesignation: ctx.sectionDesignation,
          programmeDesignation: pDoc.designation ?? "",
          semestreDesignation: s.designation ?? "",
          uniteDesignation: u.designation ?? "",
          uniteCode: u.code ?? "",
          uniteId: String(u._id),
        });
      }
    }
  }

  return {
    sectionId: ctx.sectionId,
    sectionSlug: ctx.sectionSlug,
    sectionDesignation: ctx.sectionDesignation,
    programmes: programmeOptions,
    rows,
  };
}
