"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { MatiereModel } from "@/lib/models/Matiere";
import { SectionModel } from "@/lib/models/Section";

export type PublicMetrics = {
  filieres: number;
  unites: number;
  matieres: number;
  sections: number;
};

export async function loadPublicMetrics(): Promise<PublicMetrics> {
  try {
    await connectDB();
    const [filieres, unites, matieres, sections] = await Promise.all([
      FiliereModel.countDocuments({}),
      UniteEnseignementModel.countDocuments({}),
      MatiereModel.countDocuments({}),
      SectionModel.countDocuments({}),
    ]);

    return { filieres, unites, matieres, sections };
  } catch {
    return { filieres: 0, unites: 0, matieres: 0, sections: 0 };
  }
}
