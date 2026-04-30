"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";

type AgentLite = {
  _id?: unknown;
  name?: string;
  email?: string;
  telephone?: string;
  matricule?: string;
  photo?: string;
};

type SectionRaw = {
  _id: unknown;
  designation?: string;
  cycle?: string;
  email?: string;
  slug?: string;
  logo?: string;
  description?: { title?: string; contenu?: string }[];
  programmes?: unknown[];
  bureau?: {
    chefSection?: AgentLite | null;
    chargeEnseignement?: AgentLite | null;
    chargeRecherche?: AgentLite | null;
  };
};

export type PublicSectionCard = {
  id: string;
  name: string;
  cycle: string;
  slug: string;
  logo: string;
  email: string;
  descriptionTitles: string[];
  programmesCount: number;
  bureauMembers: {
    id: string;
    role: string;
    name: string;
    email: string;
    telephone: string;
    matricule: string;
    photo: string;
  }[];
};

export async function listPublicSections(): Promise<PublicSectionCard[]> {
  try {
    await connectDB();
    const rows = (await SectionModel.find({})
      .sort({ designation: 1 })
      .populate("bureau.chefSection", "name email telephone matricule photo")
      .populate("bureau.chargeEnseignement", "name email telephone matricule photo")
      .populate("bureau.chargeRecherche", "name email telephone matricule photo")
      .select("designation cycle email slug logo description programmes bureau")
      .lean()
      .exec()) as SectionRaw[];

    return rows.map((row) => {
      const descriptionTitles = (row.description ?? [])
        .map((item) => item?.title?.trim() ?? "")
        .filter((title) => title.length > 0);

      const bureauMembers = [
        {
          id: String(row.bureau?.chefSection?._id ?? ""),
          role: "Chef de section",
          name: row.bureau?.chefSection?.name?.trim() ?? "",
          email: row.bureau?.chefSection?.email?.trim() ?? "",
          telephone: row.bureau?.chefSection?.telephone?.trim() ?? "",
          matricule: row.bureau?.chefSection?.matricule?.trim() ?? "",
          photo: row.bureau?.chefSection?.photo?.trim() ?? "",
        },
        {
          id: String(row.bureau?.chargeEnseignement?._id ?? ""),
          role: "Charge enseignement",
          name: row.bureau?.chargeEnseignement?.name?.trim() ?? "",
          email: row.bureau?.chargeEnseignement?.email?.trim() ?? "",
          telephone: row.bureau?.chargeEnseignement?.telephone?.trim() ?? "",
          matricule: row.bureau?.chargeEnseignement?.matricule?.trim() ?? "",
          photo: row.bureau?.chargeEnseignement?.photo?.trim() ?? "",
        },
        {
          id: String(row.bureau?.chargeRecherche?._id ?? ""),
          role: "Charge recherche",
          name: row.bureau?.chargeRecherche?.name?.trim() ?? "",
          email: row.bureau?.chargeRecherche?.email?.trim() ?? "",
          telephone: row.bureau?.chargeRecherche?.telephone?.trim() ?? "",
          matricule: row.bureau?.chargeRecherche?.matricule?.trim() ?? "",
          photo: row.bureau?.chargeRecherche?.photo?.trim() ?? "",
        },
      ].filter((member) => member.name.length > 0);

      return {
        id: String(row._id),
        name: row.designation?.trim() || "Section sans nom",
        cycle: row.cycle?.trim() || "Cycle non precise",
        slug: row.slug?.trim() || "",
        logo: row.logo?.trim() || "/images/logo.png",
        email: row.email?.trim() || "Email indisponible",
        descriptionTitles,
        programmesCount: row.programmes?.length ?? 0,
        bureauMembers,
      };
    });
  } catch {
    return [];
  }
}
