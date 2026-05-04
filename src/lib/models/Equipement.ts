import mongoose, { Schema, Types, Document } from "mongoose";

export interface EquipementDoc extends Document {
  designation: string;
  marque: string;
  etat: "neuf" | "bon" | "maintenance" | "hors-service";
  photo: string;
  laboratoire: Types.ObjectId;
  derniereMaintenance: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const equipementSchema = new Schema<EquipementDoc>(
  {
    designation: { type: String, required: true },
    marque: { type: String, required: true },
    etat: {
      type: String,
      enum: ["neuf", "bon", "maintenance", "hors-service"],
      required: true,
    },
    photo: { type: String, required: true },
    laboratoire: { type: Schema.Types.ObjectId, ref: "Laboratoire", required: true },
    derniereMaintenance: { type: Date, required: true },
  },
  { timestamps: true }
);

export const EquipementModel =
  (mongoose.models.Equipement as mongoose.Model<EquipementDoc>) ||
  mongoose.model<EquipementDoc>("Equipement", equipementSchema);
