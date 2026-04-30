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
  programmes?: Array<{
    _id?: unknown;
    designation?: string;
    slug?: string;
    credits?: number;
  }>;
  bureau?: {
    chefSection?: AgentLite | null;
    chargeEnseignement?: AgentLite | null;
    chargeRecherche?: AgentLite | null;
  };
  jury?: {
    cours?: {
      president?: AgentLite | null;
      secretaire?: AgentLite | null;
      membres?: AgentLite[] | null;
    };
    recherche?: {
      president?: AgentLite | null;
      secretaire?: AgentLite | null;
      membres?: AgentLite[] | null;
    };
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
  programmes: {
    id: string;
    designation: string;
    slug: string;
    credits: number;
  }[];
  juryMembers: {
    id: string;
    name: string;
    email: string;
    photo: string;
    juryType: "Jury de cours" | "Jury de recherche";
    functionInJury: "President" | "Secretaire" | "Membre";
  }[];
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

function mapPublicSectionRow(row: SectionRaw): PublicSectionCard {
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

  const juryMembers = [
    {
      id: String(row.jury?.cours?.president?._id ?? ""),
      name: row.jury?.cours?.president?.name?.trim() ?? "",
      email: row.jury?.cours?.president?.email?.trim() ?? "",
      photo: row.jury?.cours?.president?.photo?.trim() ?? "",
      juryType: "Jury de cours" as const,
      functionInJury: "President" as const,
    },
    {
      id: String(row.jury?.cours?.secretaire?._id ?? ""),
      name: row.jury?.cours?.secretaire?.name?.trim() ?? "",
      email: row.jury?.cours?.secretaire?.email?.trim() ?? "",
      photo: row.jury?.cours?.secretaire?.photo?.trim() ?? "",
      juryType: "Jury de cours" as const,
      functionInJury: "Secretaire" as const,
    },
    ...((row.jury?.cours?.membres ?? []).map((member) => ({
      id: String(member?._id ?? ""),
      name: member?.name?.trim() ?? "",
      email: member?.email?.trim() ?? "",
      photo: member?.photo?.trim() ?? "",
      juryType: "Jury de cours" as const,
      functionInJury: "Membre" as const,
    })) ?? []),
    {
      id: String(row.jury?.recherche?.president?._id ?? ""),
      name: row.jury?.recherche?.president?.name?.trim() ?? "",
      email: row.jury?.recherche?.president?.email?.trim() ?? "",
      photo: row.jury?.recherche?.president?.photo?.trim() ?? "",
      juryType: "Jury de recherche" as const,
      functionInJury: "President" as const,
    },
    {
      id: String(row.jury?.recherche?.secretaire?._id ?? ""),
      name: row.jury?.recherche?.secretaire?.name?.trim() ?? "",
      email: row.jury?.recherche?.secretaire?.email?.trim() ?? "",
      photo: row.jury?.recherche?.secretaire?.photo?.trim() ?? "",
      juryType: "Jury de recherche" as const,
      functionInJury: "Secretaire" as const,
    },
    ...((row.jury?.recherche?.membres ?? []).map((member) => ({
      id: String(member?._id ?? ""),
      name: member?.name?.trim() ?? "",
      email: member?.email?.trim() ?? "",
      photo: member?.photo?.trim() ?? "",
      juryType: "Jury de recherche" as const,
      functionInJury: "Membre" as const,
    })) ?? []),
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
    programmes: (row.programmes ?? []).map((programme) => ({
      id: String(programme?._id ?? ""),
      designation: programme?.designation?.trim() || "Programme sans designation",
      slug: programme?.slug?.trim() || "",
      credits: Number(programme?.credits ?? 0),
    })),
    juryMembers,
    bureauMembers,
  };
}

export async function listPublicSections(): Promise<PublicSectionCard[]> {
  try {
    await connectDB();
    const rows = (await SectionModel.find({})
      .sort({ designation: 1 })
      .populate("programmes", "designation slug credits")
      .populate("jury.cours.president", "name email photo")
      .populate("jury.cours.secretaire", "name email photo")
      .populate("jury.cours.membres", "name email photo")
      .populate("jury.recherche.president", "name email photo")
      .populate("jury.recherche.secretaire", "name email photo")
      .populate("jury.recherche.membres", "name email photo")
      .populate("bureau.chefSection", "name email telephone matricule photo")
      .populate("bureau.chargeEnseignement", "name email telephone matricule photo")
      .populate("bureau.chargeRecherche", "name email telephone matricule photo")
      .select("designation cycle email slug logo description programmes bureau jury")
      .lean()
      .exec()) as SectionRaw[];

    return rows.map((row) => mapPublicSectionRow(row));
  } catch {
    return [];
  }
}

export async function getPublicSectionBySlug(slug: string): Promise<PublicSectionCard | null> {
  try {
    await connectDB();
    const normalizedSlug = String(slug ?? "").trim();
    if (!normalizedSlug) return null;

    const row = (await SectionModel.findOne({ slug: normalizedSlug })
      .populate("programmes", "designation slug credits")
      .populate("jury.cours.president", "name email photo")
      .populate("jury.cours.secretaire", "name email photo")
      .populate("jury.cours.membres", "name email photo")
      .populate("jury.recherche.president", "name email photo")
      .populate("jury.recherche.secretaire", "name email photo")
      .populate("jury.recherche.membres", "name email photo")
      .populate("bureau.chefSection", "name email telephone matricule photo")
      .populate("bureau.chargeEnseignement", "name email telephone matricule photo")
      .populate("bureau.chargeRecherche", "name email telephone matricule photo")
      .select("designation cycle email slug logo description programmes bureau jury")
      .lean()
      .exec()) as SectionRaw | null;

    if (!row) return null;
    return mapPublicSectionRow(row);
  } catch {
    return null;
  }
}
