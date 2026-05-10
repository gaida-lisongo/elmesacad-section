"use server";

import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";
import { MatiereModel } from "@/lib/models/Matiere";
import { SemestreModel } from "@/lib/models/Semestre";
import { FiliereModel } from "@/lib/models/Filiere";

// Types pour la carte d'UE (utilisé sur la page d'accueil)
export type PublicUniteCard = {
  id: string;
  designation: string;
  code: string;
  credits: number;
  coursesCount: number;
};

// Types pour le détail d'une UE
export type PublicMatiereDetail = {
  id: string;
  code: string;
  designation: string;
  credits: number;
  description: string;
};

export type PublicUniteDetail = {
  id: string;
  code: string;
  designation: string;
  description: string;
  credits: number;
  filiere: string;
  préalables: string[];
  semestre: string;
  categorie: "Obligatoire" | "Facultatif" | "Optionnel";
  cycle: "Licence" | "Master" | "Doctorat";
  matieres: PublicMatiereDetail[];
};

// Types internes pour le mapping
type UniteRaw = {
  _id: unknown;
  designation?: string;
  code?: string;
  credits?: number;
  matieres?: unknown[];
  description?: unknown;
};

type MatiereRaw = {
  _id: unknown;
  designation?: string;
  code?: string;
  credits?: number;
  description?: unknown;
};

type SemestreRaw = {
  _id: unknown;
  designation?: string;
  filiere?: Types.ObjectId;
  unites?: Types.ObjectId[];
};

type FiliereRaw = {
  _id: unknown;
  designation?: string;
};

export async function listPublicUnites(limit = 8): Promise<PublicUniteCard[]> {
  try {
    await connectDB();
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const rows = (await UniteEnseignementModel.find({})
      .sort({ createdAt: -1 })
      .select("designation code credits matieres")
      .limit(safeLimit)
      .lean()
      .exec()) as UniteRaw[];

    return rows.map((row) => ({
      id: String(row._id ?? ""),
      designation: row.designation?.trim() || "Unite sans designation",
      code: row.code?.trim() || "Code indisponible",
      credits: Number(row.credits ?? 0),
      coursesCount: Array.isArray(row.matieres) ? row.matieres.length : 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Récupère les détails d'une unité d'enseignement avec ses matières associées
 * et essaie de déterminer la filière via les semestres
 */
export async function getPublicUniteById(id: string): Promise<PublicUniteDetail | null> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }

    await connectDB();

    // Récupérer l'UE avec ses matières
    const uniteRaw = (await UniteEnseignementModel.findById(id)
      .select("designation code credits matieres description")
      .lean()
      .exec()) as UniteRaw | null;

    if (!uniteRaw) {
      return null;
    }

    // Récupérer les matières associées
    const matieresRaw = (await MatiereModel.find({
      _id: { $in: (uniteRaw.matieres as Types.ObjectId[]) || [] },
    })
      .select("designation code credits description")
      .lean()
      .exec()) as MatiereRaw[];

    // Essayer de trouver la filière via les semestres
    let filiere = "Non spécifiée";
    let semestreDesignation = "Non spécifié";

    try {
      // Chercher un semestre qui contient cette UE
      const semestreWithUnite = (await SemestreModel.findOne({
        unites: { $in: [new Types.ObjectId(id)] },
      })
        .select("designation filiere")
        .lean()
        .exec()) as SemestreRaw | null;

      if (semestreWithUnite) {
        semestreDesignation = semestreWithUnite.designation?.trim() || "Non spécifié";

        // Si le semestre a une filière, la récupérer
        if (semestreWithUnite.filiere) {
          const filiereDoc = (await FiliereModel.findById(semestreWithUnite.filiere)
            .select("designation")
            .lean()
            .exec()) as FiliereRaw | null;
          filiere = filiereDoc?.designation?.trim() || "Non spécifiée";
        }
      }
    } catch {
      // Si erreur, utiliser des valeurs par défaut
      filiere = "Non spécifiée";
      semestreDesignation = "Non spécifié";
    }

    // Formater la description
    const descriptionItems = Array.isArray(uniteRaw.description)
      ? uniteRaw.description
      : [];
    const description = descriptionItems
      .map((item: { title?: string; contenu?: string }) =>
        `${item.title || ""}: ${item.contenu || ""}`
      )
      .join("\n\n")
      .trim();

    // Mock des préalables (pourrait être ajouté au modèle plus tard)
    const préalables = ["Aucun"];

    // Valeurs par défaut
    const categorie: "Obligatoire" | "Facultatif" | "Optionnel" = "Obligatoire";
    const cycle: "Licence" | "Master" | "Doctorat" = "Licence";

    // Formater les matières
    const matieres: PublicMatiereDetail[] = matieresRaw.map((m) => {
      const matiereDescriptionItems = Array.isArray(m.description)
        ? m.description
        : [];
      const matiereDescription = matiereDescriptionItems
        .map((item: { title?: string; contenu?: string }) =>
          `${item.title || ""}: ${item.contenu || ""}`
        )
        .join("\n\n")
        .trim();

      return {
        id: String(m._id ?? ""),
        code: m.code?.trim() || "Code indisponible",
        designation: m.designation?.trim() || "Matière sans désignation",
        credits: Number(m.credits ?? 0),
        description: matiereDescription || "Aucune description disponible",
      };
    });

    return {
      id: String(uniteRaw._id ?? ""),
      code: uniteRaw.code?.trim() || "Code indisponible",
      designation: uniteRaw.designation?.trim() || "Unité sans désignation",
      description: description || "Aucune description disponible",
      credits: Number(uniteRaw.credits ?? 0),
      filiere,
      préalables,
      semestre: semestreDesignation,
      categorie,
      cycle,
      matieres,
    };
  } catch {
    return null;
  }
}
