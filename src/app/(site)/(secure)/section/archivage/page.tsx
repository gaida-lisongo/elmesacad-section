import type { Metadata } from "next";
import { Types } from "mongoose";
import SectionArchivageClient, { type ArchivageBootstrap, type ProgrammeMatiereContext } from "./SectionArchivageClient";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { ProgrammeModel } from "@/lib/models/Programme";
import { AnneeModel } from "@/lib/models/Annee";
import "@/lib/models/Semestre";
import "@/lib/models/UniteEnseignement";
import "@/lib/models/Matiere";

export const metadata: Metadata = {
  title: "Archivage des notes | INBTP",
};

async function loadBootstrap(): Promise<ArchivageBootstrap> {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "organisateur" || !Types.ObjectId.isValid(session.sub)) {
    return {
      authorized: false,
      message:
        "Cette page est réservée aux organisateurs membres du bureau d'une section (chef de section, chargé d'enseignement ou chargé de recherche).",
      sections: [],
      annees: [],
      programmesBySection: {},
    };
  }

  await connectDB();
  const agentId = new Types.ObjectId(session.sub);
  const sectionsRaw = await SectionModel.find({
    $or: [
      { "bureau.chefSection": agentId },
      { "bureau.chargeEnseignement": agentId },
      { "bureau.chargeRecherche": agentId },
    ],
  })
    .select("_id designation slug cycle")
    .sort({ designation: 1 })
    .lean();

  if (!sectionsRaw.length) {
    return {
      authorized: false,
      message: "Aucune section trouvée : vous n'êtes associé à aucun bureau de section.",
      sections: [],
      annees: [],
      programmesBySection: {},
    };
  }

  const sectionIds = sectionsRaw.map((s) => s._id);
  const programmesRaw = await ProgrammeModel.find({
    section: { $in: sectionIds },
  })
    .select("_id section designation slug credits semestres")
    .populate({
      path: "semestres",
      model: "Semestre",
      populate: {
        path: "unites",
        model: "UniteEnseignement",
        populate: {
          path: "matieres",
          model: "Matiere",
          select: "_id designation code",
        },
      },
    })
    .sort({ designation: 1 })
    .lean();

  const anneesRaw = await AnneeModel.find().select("_id designation slug debut fin status").sort({ debut: -1 }).lean();

  const sections = sectionsRaw.map((s) => ({
    id: String(s._id),
    designation: String(s.designation ?? ""),
    slug: String(s.slug ?? ""),
    cycle: String(s.cycle ?? ""),
  }));

  const programmesBySection: ArchivageBootstrap["programmesBySection"] = {};
  for (const section of sections) {
    programmesBySection[section.id] = [];
  }

  for (const row of programmesRaw as Array<Record<string, unknown>>) {
    const sectionId = String(row.section ?? "");
    if (!programmesBySection[sectionId]) continue;

    const semestres = Array.isArray(row.semestres) ? (row.semestres as Array<Record<string, unknown>>) : [];
    const matieresMap = new Map<string, ProgrammeMatiereContext>();

    for (const sem of semestres) {
      const unites = Array.isArray(sem.unites) ? (sem.unites as Array<Record<string, unknown>>) : [];
      for (const ue of unites) {
        const matieres = Array.isArray(ue.matieres) ? (ue.matieres as Array<Record<string, unknown>>) : [];
        for (const m of matieres) {
          const id = String(m._id ?? "");
          const designation = String(m.designation ?? "").trim();
          if (!id || !designation) continue;
          matieresMap.set(id, {
            key: `${String(sem._id ?? "")}|${String(ue._id ?? "")}|${id}`,
            matiere: {
              designation,
              reference: id,
              credits: Number(m.credits ?? 0),
            },
            unite: {
              designation: String(ue.designation ?? ""),
              reference: String(ue._id ?? ""),
              code: String(ue.code ?? ""),
              credits: Number(ue.credits ?? 0),
            },
            semestre: {
              designation: String(sem.designation ?? ""),
              reference: String(sem._id ?? ""),
              credits: Number(sem.credits ?? 0),
            },
          });
        }
      }
    }

    programmesBySection[sectionId].push({
      id: String(row._id ?? ""),
      designation: String(row.designation ?? ""),
      slug: String(row.slug ?? ""),
      credits: Number(row.credits ?? 0),
      matieres: [...matieresMap.values()].sort((a, b) =>
        String(a.matiere?.designation ?? "").localeCompare(String(b.matiere?.designation ?? ""), "fr")
      ),
    });
  }

  const annees = anneesRaw.map((a) => ({
    id: String(a._id),
    designation: String(a.designation ?? ""),
    slug: String(a.slug ?? ""),
    debut: Number(a.debut ?? 0),
    fin: Number(a.fin ?? 0),
    status: Boolean(a.status),
  }));

  return {
    authorized: true,
    sections,
    annees,
    programmesBySection,
  };
}

export default async function SectionArchivagePage() {
  const bootstrap = await loadBootstrap();
  return <SectionArchivageClient bootstrap={bootstrap} />;
}

