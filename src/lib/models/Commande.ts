import mongoose, { Schema, Types } from "mongoose";

export interface CommandeDoc {
  _id: Types.ObjectId;
  student: {
    matricule: string;
    email: string;
  },
  ressource: {
    categorie: string;
    reference: string;
  },
  transaction: {
    orderNumber?: string;
    amount: number;
    currency: "USD" | "CDF";
    phoneNumber: string;
  }
  status: "pending" | "paid" | "failed" | "completed";
  createdAt: Date;
  updatedAt: Date;
}

const commandeSchema = new Schema<CommandeDoc>(
  {
    student: {
      matricule: { type: String, required: true },
      email: { type: String, required: true },
    },
    ressource: {
      categorie: { type: String, required: true },
      reference: { type: String, required: true },
    },
    transaction: {
      orderNumber: { type: String, required: true },
      amount: { type: Number, required: true },
      currency: { type: String, required: true, enum: ["USD", "CDF"] },
      phoneNumber: { type: String, required: true },
    },
    status: { type: String, required: true, enum: ["pending", "paid", "failed", "completed"] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

commandeSchema.index({
  "transaction.orderNumber": 1,
  "student.email": 1,
  "student.matricule": 1,
  "ressource.categorie": 1,
  "ressource.reference": 1,
  status: 1,
});
commandeSchema.index({
  "student.email": 1,
  "student.matricule": 1,
  "ressource.categorie": 1,
  "ressource.reference": 1,
  status: 1,
});


export const CommandeModel =
  (mongoose.models.Commande as mongoose.Model<CommandeDoc>) ||
  mongoose.model<CommandeDoc>("Commande", commandeSchema);
