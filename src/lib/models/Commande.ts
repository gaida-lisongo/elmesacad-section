import mongoose, { Schema, Types } from "mongoose";
import {
  COMMANDE_PRODUIT_VALUES,
  type CommandeProduit,
} from "@/lib/constants/commandeProduit";

export interface CommandeDoc {
  _id: Types.ObjectId;
  student: {
    matricule: string;
    email: string;
  };
  ressource: {
    categorie: string;
    reference: string;
    produit: CommandeProduit;
    metadata?: Record<string, unknown>;
  };
  transaction: {
    orderNumber?: string;
    amount: number;
    currency: "USD" | "CDF";
    phoneNumber: string;
    /** Réponses brutes fournisseur (collect / dernier check). */
    providerResponses?: {
      collect?: unknown;
      lastCheck?: unknown;
    };
    /** Réponse du microservice étudiant / order distante pour redirection & traitement métier. */
    microserviceResponse?: unknown;
  };
  /** Recharge liée (suivi admin) lorsque l’étudiant est en base. */
  rechargeId?: string;
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
      produit: {
        type: String,
        required: true,
        enum: COMMANDE_PRODUIT_VALUES,
        default: "activite",
      },
      metadata: { type: Schema.Types.Mixed, default: {} },
    },
    transaction: {
      orderNumber: { type: String, required: false },
      amount: { type: Number, required: true },
      currency: { type: String, required: true, enum: ["USD", "CDF"] },
      phoneNumber: { type: String, required: true, default: "" },
      providerResponses: {
        type: {
          collect: { type: Schema.Types.Mixed },
          lastCheck: { type: Schema.Types.Mixed },
        },
        required: false,
      },
      microserviceResponse: { type: Schema.Types.Mixed, required: false },
    },
    rechargeId: { type: String, required: false, sparse: true, index: true },
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
commandeSchema.index({ "ressource.produit": 1, status: 1 });

export const CommandeModel =
  (mongoose.models.Commande as mongoose.Model<CommandeDoc>) ||
  mongoose.model<CommandeDoc>("Commande", commandeSchema);
