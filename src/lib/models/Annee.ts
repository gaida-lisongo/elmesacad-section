import mongoose, { Schema, Types } from "mongoose";

export type AnneeDoc = {
  _id: Types.ObjectId;
  /** Libellé affiché (ex. 2023-2024) */
  designation: string;
  slug: string;
  debut: number;
  fin: number;
  status: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

const anneeSchema = new Schema<AnneeDoc>(
  {
    designation: { type: String, required: true, default: "" },
    slug: { type: String, required: true, unique: true, index: true },
    debut: { type: Number, required: true },
    fin: { type: Number, required: true },
    status: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const AnneeModel =
  (mongoose.models.Annee as mongoose.Model<AnneeDoc>) ||
  mongoose.model<AnneeDoc>("Annee", anneeSchema);
