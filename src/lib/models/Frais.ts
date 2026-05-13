import mongoose, { Schema, Types } from "mongoose";

export interface Frais {
    _id: Types.ObjectId;
    categories: string[];
    designation: string;
    montant: number;
    paiements: [{
        email: string;
        matricule: string;
    }];
    createdAt: Date;
    updatedAt: Date;
}

const fraisSchema = new Schema<Frais>({
    categories: { type: [String], required: true },
    designation: { type: String, required: true },
    montant: { type: Number, required: true },
    paiements: { type: [{ email: String, matricule: String }], required: true },
}, { timestamps: true });

export const FraisModel = mongoose.models.Frais || mongoose.model<Frais>("Frais", fraisSchema);