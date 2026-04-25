import mongoose, { Schema, Types } from "mongoose";

const descriptionItemSchema = new Schema(
  {
    title: { type: String, required: true },
    contenu: { type: String, required: true },
  },
  { _id: false }
);

export type FiliereDoc = {
  _id: Types.ObjectId;
  designation: string;
  slug: string;
  description: { title: string; contenu: string }[];
  semestres: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

const filiereSchema = new Schema<FiliereDoc>(
  {
    designation: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: [descriptionItemSchema], default: [] },
    semestres: [{ type: Schema.Types.ObjectId, ref: "Semestre" }],
  },
  { timestamps: true }
);

export const FiliereModel =
  (mongoose.models.Filiere as mongoose.Model<FiliereDoc>) ||
  mongoose.model<FiliereDoc>("Filiere", filiereSchema);
