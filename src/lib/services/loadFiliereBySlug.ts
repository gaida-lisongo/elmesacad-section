import { connectDB } from "@/lib/services/connectedDB";
import { FiliereModel } from "@/lib/models/Filiere";
/** Enregistre les modèles pour les chaînes populate (ref Semestre → UniteEnseignement → Matiere). */
import "@/lib/models/Semestre";
import "@/lib/models/UniteEnseignement";
import "@/lib/models/Matiere";

/**
 * Filière + semestres triés + unités + matières (parcours pédagogique pour `/filiere/[slug]`).
 */
export async function loadFiliereStructureBySlug(slug: string) {
  await connectDB();
  const doc = await FiliereModel.findOne({ slug })
    .populate({
      path: "semestres",
      options: { sort: { order: 1, createdAt: 1 } },
      populate: {
        path: "unites",
        options: { sort: { designation: 1 } },
        populate: { path: "matieres", options: { sort: { designation: 1 } } },
      },
    })
    .lean()
    .exec();
  return doc;
}
