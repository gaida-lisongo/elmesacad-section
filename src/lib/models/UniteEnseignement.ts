import mongoose, { Schema, Types } from "mongoose";

const descriptionItemSchema = new Schema(
  {
    title: { type: String, required: true },
    contenu: { type: String, required: true },
  },
  { _id: false }
);

export type UniteEnseignementDoc = {
  _id: Types.ObjectId;
  designation: string;
  credits: number;
  code: string;
  description: { title: string; contenu: string }[];
  matieres: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

const uniteSchema = new Schema<UniteEnseignementDoc>(
  {
    designation: { type: String, required: true },
    credits: { type: Number, required: true, min: 0 },
    code: { type: String, required: true },
    description: { type: [descriptionItemSchema], default: [] },
    matieres: [{ type: Schema.Types.ObjectId, ref: "Matiere" }],
  },
  { timestamps: true }
);

uniteSchema.index({ code: 1 }, { unique: true });

export const UniteEnseignementModel =
  (mongoose.models.UniteEnseignement as mongoose.Model<UniteEnseignementDoc>) ||
  mongoose.model<UniteEnseignementDoc>("UniteEnseignement", uniteSchema);
