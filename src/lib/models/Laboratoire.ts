import mongoose, { Schema, Types, Document } from "mongoose";

export interface LaboratoireDoc extends Document {
  nom: string;
  slug: string;
  techniciens: {
    fonction: "admin" | "moderateur";
    agent: Types.ObjectId;
  }[];
  departements: {
    designation: string;
    description: { title: string; contenu: string[] }[];
    galerie: { image: string; evenement: string }[];
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

const laboratoireSchema = new Schema<LaboratoireDoc>(
  {
    nom: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    techniciens: [
      {
        fonction: { type: String, enum: ["admin", "moderateur"], required: true },
        agent: { type: Schema.Types.ObjectId, ref: "Agent", required: true },
      },
    ],
    departements: [
      {
        designation: { type: String, required: true },
        description: [
          {
            title: { type: String, required: true },
            contenu: [{ type: String }],
          },
        ],
        galerie: [
          {
            image: { type: String, required: true },
            evenement: { type: String, required: true },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

export const LaboratoireModel =
  (mongoose.models.Laboratoire as mongoose.Model<LaboratoireDoc>) ||
  mongoose.model<LaboratoireDoc>("Laboratoire", laboratoireSchema);
