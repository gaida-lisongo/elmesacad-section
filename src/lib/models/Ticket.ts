import mongoose, { Schema, Types } from "mongoose";

export type TicketCategorie = "student" | "agent" | "visiteur";
export type TicketStatus = "pending" | "en_cours" | "resolu" | "ferme";

/**
 * - `author: true` = message du requérant (client)
 * - `author: false` = message de l’équipe support (admin / agent)
 */
export type TicketChatMessage = {
  _id: Types.ObjectId;
  author: boolean;
  message: string;
  assets: string[];
  createdAt: Date;
};

export type TicketDoc = {
  _id: Types.ObjectId;
  objet: string;
  categorie: TicketCategorie;
  /** Ex. TKT-AB12CD34 (unique) */
  reference: string;
  message: string;
  nomComplet: string;
  email: string;
  telephone: string;
  chats: TicketChatMessage[];
  status: TicketStatus;
  createdAt: Date;
  updatedAt: Date;
};

const ticketMessageSchema = new Schema<TicketChatMessage>(
  {
    author: { type: Boolean, required: true },
    message: { type: String, required: true, trim: true, maxlength: 20_000 },
    assets: { type: [String], default: [] },
    createdAt: { type: Date, default: () => new Date() },
  },
  { _id: true }
);

const ticketSchema = new Schema<TicketDoc>(
  {
    objet: { type: String, required: true, trim: true, maxlength: 500 },
    categorie: {
      type: String,
      required: true,
      enum: ["student", "agent", "visiteur"] satisfies TicketCategorie[],
      default: "visiteur",
    },
    reference: { type: String, required: true, unique: true, index: true, trim: true },
    message: { type: String, required: true, trim: true, maxlength: 20_000 },
    nomComplet: { type: String, required: true, trim: true, maxlength: 300 },
    email: { type: String, required: true, index: true, trim: true, lowercase: true },
    telephone: { type: String, required: true, trim: true, maxlength: 40 },
    chats: { type: [ticketMessageSchema], default: [] },
    status: {
      type: String,
      required: true,
      enum: ["pending", "en_cours", "resolu", "ferme"] satisfies TicketStatus[],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

ticketSchema.index({ status: 1, createdAt: -1 });
ticketSchema.index({ email: 1, createdAt: -1 });

export const TicketModel =
  (mongoose.models.Ticket as mongoose.Model<TicketDoc>) ||
  mongoose.model<TicketDoc>("Ticket", ticketSchema);
