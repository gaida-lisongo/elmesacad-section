import mongoose, { Schema, Types } from "mongoose";

const descriptionItemSchema = new Schema(
  {
    title: { type: String, required: true },
    contenu: { type: String, required: true },
  },
  { _id: false }
);

export type SectionDoc = {
  _id: Types.ObjectId;
  designation: string;
  cycle: string;
  slug: string;
  email?: string;
  website?: string;
  telephone?: string;
  description: { title: string; contenu: string }[];
  apiKey: string;
  secretKey: string;
  programmes: Types.ObjectId[];
  bureau: {
    chefSection?: Types.ObjectId;
    chargeEnseignement?: Types.ObjectId;
    chargeRecherche?: Types.ObjectId;
  };
  logo: string;
  createdAt?: Date;
  updatedAt?: Date;
};

const sectionSchema = new Schema<SectionDoc>(
  {
    designation: { type: String, required: true },
    logo: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    website: { type: String },
    telephone: { type: String },
    description: { type: [descriptionItemSchema], default: [] },
    apiKey: { type: String, required: true, unique: true, index: true },
    secretKey: { type: String, required: true },
    programmes: [{ type: Schema.Types.ObjectId, ref: "Programme" }],
    bureau: {
      chefSection: { type: Schema.Types.ObjectId, ref: "Agent" },
      chargeEnseignement: { type: Schema.Types.ObjectId, ref: "Agent" },
      chargeRecherche: { type: Schema.Types.ObjectId, ref: "Agent" },
    },
    cycle: { type: String, required: true },
  },
  { timestamps: true }
);

export const SectionModel =
  (mongoose.models.Section as mongoose.Model<SectionDoc>) ||
  mongoose.model<SectionDoc>("Section", sectionSchema);
