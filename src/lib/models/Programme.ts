import mongoose, { Schema, Types } from "mongoose";

const descriptionItemSchema = new Schema(
  {
    title: { type: String, required: true },
    contenu: { type: String, required: true },
  },
  { _id: false }
);

export type ProgrammeDoc = {
  _id: Types.ObjectId;
  section: Types.ObjectId;
  designation: string;
  slug: string;
  credits: number;
  description: { title: string; contenu: string }[];
  semestres: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
};

const programmeSchema = new Schema<ProgrammeDoc>(
  {
    section: { type: Schema.Types.ObjectId, ref: "Section", required: true, index: true },
    designation: { type: String, required: true },
    slug: { type: String, required: true, index: true },
    credits: { type: Number, required: true, min: 0 },
    description: { type: [descriptionItemSchema], default: [] },
    semestres: [{ type: Schema.Types.ObjectId, ref: "Semestre" }],
  },
  { timestamps: true }
);

programmeSchema.index({ section: 1, slug: 1 }, { unique: true });

export const ProgrammeModel =
  (mongoose.models.Programme as mongoose.Model<ProgrammeDoc>) ||
  mongoose.model<ProgrammeDoc>("Programme", programmeSchema);
