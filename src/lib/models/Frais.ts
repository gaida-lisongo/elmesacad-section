import mongoose, { Schema, Types } from "mongoose";

export interface Frais {
    _id: Types.ObjectId;
    annee: Types.ObjectId;
    designation: string;
    montant: number;
    slug: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Modalite {
    _id: Types.ObjectId;
    frais: Types.ObjectId;
    designation: string;
    montant: number;
    slug: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Paiement {
    _id: Types.ObjectId;
    modalite: Types.ObjectId;
    email?: string;
    matricule?: string;
    reference: string;
    status: 'pending' | 'paid' | 'failed' | 'completed';
    createdAt: Date;
    updatedAt: Date;
}

export interface RessourceFrais {
    _id: Types.ObjectId;
    modalites: {
        _id: Types.ObjectId;
        designation: string;
        montant: number;
        slug: string;
        frais: {
            _id: Types.ObjectId;
            designation: string;
            montant: number;
            slug: string;
        };
    }[];
    ressource: {
        type: string;
        designation: string;
        _id: string;
    };
    createdAt: Date;
    updatedAt: Date;
}

const fraisSchema = new Schema<Frais>({
    annee: { type: Schema.Types.ObjectId, ref: "Annee", required: true },
    designation: { type: String, required: true },
    montant: { type: Number, required: true },
    slug: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const modaliteSchema = new Schema<Modalite>({
    frais: { type: Schema.Types.ObjectId, ref: "Frais", required: true },
    designation: { type: String, required: true },
    montant: { type: Number, required: true },
    slug: { type: String, required: true },
    description: { type: String, required: false },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const paiementSchema = new Schema<Paiement>({
    modalite: { type: Schema.Types.ObjectId, ref: "Modalite", required: true },
    email: { type: String, required: false },
    matricule: { type: String, required: false },
    reference: { type: String, required: true },
    status: { type: String, required: true, enum: ['pending', 'paid', 'failed', 'completed'] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const ressourceFraisSchema = new Schema<RessourceFrais>({
    modalites: [{
        designation: { type: String, required: true },
        montant: { type: Number, required: true },
        slug: { type: String, required: true },
        frais: {
            designation: { type: String, required: true },
            montant: { type: Number, required: true },
            slug: { type: String, required: true },
        }
    }],
    ressource: {
        type: {
            type: String,
            required: true
        },
        designation: { type: String, required: true },
        _id: { type: String, required: true }
    },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const FraisModel = mongoose.models.Frais || mongoose.model<Frais>("Frais", fraisSchema);
export const ModaliteModel = mongoose.models.Modalite || mongoose.model<Modalite>("Modalite", modaliteSchema);
export const PaiementModel = mongoose.models.Paiement || mongoose.model<Paiement>("Paiement", paiementSchema);
export const RessourceFraisModel = mongoose.models.RessourceFrais || mongoose.model<RessourceFrais>("RessourceFrais", ressourceFraisSchema);