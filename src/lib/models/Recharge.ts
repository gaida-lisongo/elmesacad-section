import mongoose, { Schema, Types } from "mongoose";

export interface RechargeDoc {
  _id: Types.ObjectId;
  studentId: Types.ObjectId;
  /** Lien optionnel vers une commande marketplace / résolution (id Mongo string). */
  commandeId?: string;
  orderNumber?: string;
  amount: number;
  currency: "USD" | "CDF";
  phoneNumber: string;
  status: "pending" | "paid" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const rechargeSchema = new Schema<RechargeDoc>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, index: true },
    commandeId: { type: String, sparse: true, index: true },
    orderNumber: { type: String, sparse: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, required: true, enum: ["USD", "CDF"] },
    phoneNumber: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "paid", "failed"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

rechargeSchema.index({ studentId: 1, createdAt: -1 });
rechargeSchema.index({ studentId: 1, status: 1, createdAt: -1 });

export const RechargeModel =
  (mongoose.models.Recharge as mongoose.Model<RechargeDoc>) ||
  mongoose.model<RechargeDoc>("Recharge", rechargeSchema);
