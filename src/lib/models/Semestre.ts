import mongoose, { Schema, Types } from "mongoose";

const descriptionItemSchema = new Schema(
  {
    title: { type: String, required: true },
    contenu: { type: String, required: true },
  },
  { _id: false }
);

/** Semestre d'une filière (filiere requis) ou d'un programme de section (programme requis) — l'un seulement. */
export type SemestreDoc = {
  _id: Types.ObjectId;
  designation: string;
  credits?: number;
  order: number;
  unites: Types.ObjectId[];
  filiere?: Types.ObjectId;
  programme?: Types.ObjectId;
  description: { title: string; contenu: string }[];
  createdAt?: Date;
  updatedAt?: Date;
};

const semestreSchema = new Schema<SemestreDoc>(
  {
    designation: { type: String, required: true },
    credits: { type: Number, min: 0 },
    order: { type: Number, default: 0, index: true },
    unites: [{ type: Schema.Types.ObjectId, ref: "UniteEnseignement" }],
    filiere: { type: Schema.Types.ObjectId, ref: "Filiere" },
    programme: { type: Schema.Types.ObjectId, ref: "Programme" },
    description: { type: [descriptionItemSchema], default: [] },
  },
  { timestamps: true }
);

semestreSchema.index(
  { filiere: 1, order: 1 },
  { partialFilterExpression: { filiere: { $exists: true, $ne: null } } }
);
semestreSchema.index(
  { programme: 1, order: 1 },
  { partialFilterExpression: { programme: { $exists: true, $ne: null } } }
);

export const SemestreModel =
  (mongoose.models.Semestre as mongoose.Model<SemestreDoc>) ||
  mongoose.model<SemestreDoc>("Semestre", semestreSchema);
