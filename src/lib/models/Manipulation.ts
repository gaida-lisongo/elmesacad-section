import mongoose, { Schema, Types, Document } from "mongoose";

export interface EtudiantInscrit {
  etudiant: Types.ObjectId;
  rapportUrl?: string;
  score: number;
  observations?: string;
  status: "en_attente" | "soumis" | "corrige";
  decision?: "valide" | "echec" | "a_refaire";
  dateSoumission?: Date;
}

export interface ManipulationDoc extends Document {
  titre: string;
  description: string;
  objectifs: string[];
  laboratoire: Types.ObjectId;
  etudiantsInscrits: EtudiantInscrit[];
  createdAt?: Date;
  updatedAt?: Date;
}

const manipulationSchema = new Schema<ManipulationDoc>(
  {
    titre: { type: String, required: true },
    description: { type: String, required: true },
    objectifs: [{ type: String }],
    laboratoire: { type: Schema.Types.ObjectId, ref: "Laboratoire", required: true },
    etudiantsInscrits: [
      {
        etudiant: { type: Schema.Types.ObjectId, ref: "Student", required: true },
        rapportUrl: { type: String },
        score: { type: Number, default: 0 },
        observations: { type: String },
        status: {
          type: String,
          enum: ["en_attente", "soumis", "corrige"],
          default: "en_attente",
        },
        decision: {
          type: String,
          enum: ["valide", "echec", "a_refaire"],
        },
        dateSoumission: { type: Date },
      },
    ],
  },
  { timestamps: true }
);

export const ManipulationModel =
  (mongoose.models.Manipulation as mongoose.Model<ManipulationDoc>) ||
  mongoose.model<ManipulationDoc>("Manipulation", manipulationSchema);
