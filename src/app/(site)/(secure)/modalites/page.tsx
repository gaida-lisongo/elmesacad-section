import { notFound } from "next/navigation";
import { connectDB } from "@/lib/services/connectedDB";
import { ModaliteModel, PaiementModel } from "@/lib/models/Frais";
import { AnneeModel } from "@/lib/models/Annee";
import { FraisModel } from "@/lib/models/Frais";
import ModalitesPaiementsClient from "./ModalitesPaiementsClient";
// Force le chargement des modèles dépendants dans le registre Mongoose
void AnneeModel;
void FraisModel;

export const dynamic = "force-dynamic";

type ModaliteDoc = {
    _id: string;
    designation: string;
    montant: number;
    slug: string;
    description?: string;
    frais: {
        _id: string;
        designation: string;
        slug: string;
        annee?: { designation?: string };
    };
};

type PaiementDoc = {
    _id: string;
    modalite: string;
    email?: string;
    matricule?: string;
    reference: string;
    status: 'pending' | 'paid' | 'failed' | 'completed';
    createdAt: string;
    updatedAt: string;
};

// On ajoute 'id' dans le type pour correspondre parfaitement aux attentes du composant Client
type ModaliteWithPaiements = ModaliteDoc & {
    id: string; 
    paiements: (PaiementDoc & { id: string })[];
};

export default async function ModalitesPage() {
    await connectDB();

    const modalites = await ModaliteModel.find()
        .populate({
            path: "frais",
            populate: { path: "annee", model: "Annee" }
        })
        .sort({ createdAt: -1 })
        .lean();

    if (!modalites || modalites.length === 0) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Modalités de paiement</h1>
                <p>Aucune modalité trouvée. Créez d'abord un frais avec ses modalités.</p>
            </div>
        );
    }

    const modaliteIds = modalites.map((m: any) => m._id.toString());
    const paiements = await PaiementModel.find({
        modalite: { $in: modaliteIds.map((id: string) => new (require("mongoose").Types.ObjectId)(id)) }
    })
        .sort({ createdAt: -1 })
        .lean();

    const serializedModalites: ModaliteWithPaiements[] = JSON.parse(
        JSON.stringify(
            modalites.map((m: any) => ({
                ...m,
                id: m._id.toString(), // <-- LA CORRECTION EST ICI : On injecte l'id demandé par le client
                paiements: paiements
                    .filter((p: any) => p.modalite.toString() === m._id.toString())
                    .map((p: any) => ({
                        ...p,
                        id: p._id.toString(),
                    })),
            }))
        )
    );

    const tabs = serializedModalites.map((m) => ({
        label: `${m.frais?.designation || "Frais"} — ${m.designation}`,
        value: m.slug,
        id: m._id,
    }));

    return (
        <ModalitesPaiementsClient
            initialTabs={tabs}
            initialModalites={serializedModalites}
        />
    );
}