import mongoose, { Schema, Types } from "mongoose";

const descriptionItemSchema = new Schema(
  {
    title: { type: String, required: true },
    contenu: { type: String, required: true },
  },
  { _id: false }
);

export type MatiereDoc = {
  _id: Types.ObjectId;
  unite: Types.ObjectId;
  designation: string;
  credits: number;
  code?: string;
  description: { title: string; contenu: string }[];
  createdAt?: Date;
  updatedAt?: Date;
};

const matiereSchema = new Schema<MatiereDoc>(
  {
    unite: { type: Schema.Types.ObjectId, ref: "UniteEnseignement", required: true, index: true },
    designation: { type: String, required: true },
    credits: { type: Number, required: true, min: 0 },
    code: { type: String },
    description: { type: [descriptionItemSchema], default: [] },
  },
  { timestamps: true }
);

export const MatiereModel =
  (mongoose.models.Matiere as mongoose.Model<MatiereDoc>) ||
  mongoose.model<MatiereDoc>("Matiere", matiereSchema);
