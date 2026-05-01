import mongoose, { Schema, Types } from "mongoose";

// Interface Mère
export interface User {
    name: string;
    email: string;
    matricule: string;
    sexe: 'M' | 'F';
    dateDeNaissance: Date;
    nationalite: string;
    lieuDeNaissance: string;
    adresse: string;
    telephone: string;
    photo: string;
    diplome: string;
    ville: string;
    status: 'active' | 'inactive';
    createdAt?: Date;
    updatedAt?: Date;
}

// Interface Fille : Student
export interface Student extends User {
    _id: Types.ObjectId;
    cycle: string;
    transactions: {
        ressourceId: string;
        amount: number;
        status: 'pending' | 'paid' | 'failed';
        date: Date;
        categorie: string;
        /** Commande Next.js (marketplace / résolution). */
        commandeId?: string;
        /** Identifiant commande côté microservice (étudiant ou titulaire), si exposé par l’API. */
        microserviceOrderId?: string;
        /** Réponse ou extrait renvoyé par le microservice (création de commande, soumission, etc.). */
        microserviceData?: unknown;
    }[];
    deposits: {
        /** Synchronisé avec la collection `recharges` (même id) */
        rechargeId?: string;
        orderNumber?: string;
        amount: number;
        currency: 'USD' | 'CDF';
        phoneNumber: string;
        status: 'pending' | 'paid' | 'failed';
    }[];
}

// Interface Fille : Agent
export interface Agent extends User {
    _id: Types.ObjectId;
    role: 'organisateur' | 'gestionnaire' | 'titulaire' | 'admin';
    withdrawals: {
        orderNumber: string;
        phoneNumber: string;
        amount: number;
        currency: 'USD' | 'CDF';
        status: 'pending' | 'paid' | 'failed';
        date: Date;
    }[];
}

export interface Authorization {
    _id: Types.ObjectId;
    designation: string;
    code: string;
    agentId: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const userFields = {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    matricule: { type: String, required: true, unique: true },
    sexe: { type: String, required: true, enum: ['M', 'F'] },
    dateDeNaissance: { type: Date, required: true },
    nationalite: { type: String, required: true },
    lieuDeNaissance: { type: String, required: true },
    adresse: { type: String, required: true },
    telephone: { type: String, required: true },
    photo: { type: String, required: true },
    diplome: { type: String, required: true },
    ville: { type: String, required: true },
    status: { type: String, required: true, enum: ['active', 'inactive'] },
};

const studentSchema = new Schema<Student>({
    ...userFields,
    cycle: { type: String, required: true },
    deposits: [{
        rechargeId: { type: String },
        orderNumber: { type: String },
        amount: { type: Number, required: true },
        currency: { type: String, required: true, enum: ['USD', 'CDF'] },
        phoneNumber: { type: String, required: true },
        status: { type: String, required: true, enum: ['pending', 'paid', 'failed'] },
    }],
    transactions: [{
        ressourceId: { type: String, required: true },
        amount: { type: Number, required: true },
        status: { type: String, required: true, enum: ['pending', 'paid', 'failed'] },
        date: { type: Date, default: Date.now },
        categorie: { type: String, required: true },
        commandeId: { type: String, required: false },
        microserviceOrderId: { type: String, required: false },
        microserviceData: { type: Schema.Types.Mixed, required: false },
    }]
}, { timestamps: true });

const agentSchema = new Schema<Agent>({
    ...userFields,
    role: { 
        type: String, 
        required: true, 
        enum: ['organisateur', 'gestionnaire', 'titulaire', 'admin'] 
    },
    withdrawals: [{
        orderNumber: { type: String, required: true },
        phoneNumber: { type: String, required: true },
        amount: { type: Number, required: true },
        currency: { type: String, required: true, enum: ['USD', 'CDF'] },
        status: { type: String, required: true, enum: ['pending', 'paid', 'failed'] },
        date: { type: Date, default: Date.now }
    }],
}, { timestamps: true });

const authorizationSchema = new Schema<Authorization>({
    designation: { type: String, required: true },
    code: { type: String, required: true },
    agentId: { type: Schema.Types.ObjectId, ref: 'Agent', required: true },
}, { timestamps: true });


export const StudentModel =
    (mongoose.models.Student as mongoose.Model<Student>) ||
    mongoose.model<Student>("Student", studentSchema);

export const AgentModel =
    (mongoose.models.Agent as mongoose.Model<Agent>) ||
    mongoose.model<Agent>("Agent", agentSchema);

export const AuthorizationModel =
    (mongoose.models.Authorization as mongoose.Model<Authorization>) ||
    mongoose.model<Authorization>("Authorization", authorizationSchema);
