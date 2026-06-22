import mongoose, { Schema, Types, Document } from "mongoose";

export interface QuestionQCM {
  question: string;
  propositions: string[];
  bonneReponse: number;
  points: number;
}

export interface FormationDoc extends Document {
  image: string;
  slug: string;
  titre: string;
  description?: string;
  objectifs: string[];
  questionnaire: QuestionQCM[];
  dateFormation: Date;
  actif: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const questionSchema = new Schema<QuestionQCM>(
  {
    question: {
      type: String,
      required: true,
      trim: true,
    },

    propositions: [
      {
        type: String,
        required: true,
        trim: true,
      },
    ],

    bonneReponse: {
      type: Number,
      required: true,
      min: 0,
    },

    points: {
      type: Number,
      default: 2,
      min: 1,
    },
  },
  {
    _id: false,
  }
);

const formationSchema = new Schema<FormationDoc>(
  {
    image: {
      type: String,
      required: true,
    },

    slug: {
      type: String,
      required: true,
      trim: true,
    },
    
    titre: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    objectifs: [
      {
        type: String,
        trim: true,
      },
    ],

    questionnaire: [questionSchema],

    dateFormation: {
      type: Date,
      required: true,
    },

    actif: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const FormationModel =
  (mongoose.models.Formation as mongoose.Model<FormationDoc>) ||
  mongoose.model<FormationDoc>("Formation", formationSchema);

/**
 * Types de référence (structure pédagogique) — modèles Mongoose dans des fichiers dédiés.
 */
export type { AnneeDoc } from "./Annee";
export { AnneeModel } from "./Annee";
export type { MatiereDoc } from "./Matiere";
export { MatiereModel } from "./Matiere";
export type { UniteEnseignementDoc } from "./UniteEnseignement";
export { UniteEnseignementModel } from "./UniteEnseignement";
export type { SemestreDoc } from "./Semestre";
export { SemestreModel } from "./Semestre";
export type { FiliereDoc } from "./Filiere";
export { FiliereModel } from "./Filiere";
export type { ProgrammeDoc } from "./Programme";
export { ProgrammeModel } from "./Programme";
export type { SectionDoc } from "./Section";
export { SectionModel } from "./Section";
