"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { SectionModel } from "@/lib/models/Section";

export type FooterLinkItem = {
  name: string;
  slug: string;
};

export async function loadPublicFooterLinks(): Promise<{
  filieres: FooterLinkItem[];
  sections: FooterLinkItem[];
}> {
  try {
    await connectDB();

    const [filieresRows, sectionsRows] = await Promise.all([
      FiliereModel.find({}).sort({ designation: 1 }).select("designation slug").lean().exec(),
      SectionModel.find({}).sort({ designation: 1 }).select("designation slug").lean().exec(),
    ]);

    const filieres = filieresRows
      .map((row) => ({
        name: String(row.designation ?? "").trim(),
        slug: String(row.slug ?? "").trim(),
      }))
      .filter((item) => item.name && item.slug);

    const sections = sectionsRows
      .map((row) => ({
        name: String(row.designation ?? "").trim(),
        slug: String(row.slug ?? "").trim(),
      }))
      .filter((item) => item.name && item.slug);

    return { filieres, sections };
  } catch {
    return { filieres: [], sections: [] };
  }
}
