import FraisClient from "./FraisClient";
import { connectDB } from "@/lib/services/connectedDB";
import { AnneeModel } from "@/lib/models/Annee";
import { FraisModel } from "@/lib/models/Frais";

export const dynamic = "force-dynamic";

export default async function FraisPage() {
    await connectDB();

    const annees = await AnneeModel.find().sort({ debut: -1 }).lean();

    if (annees.length === 0) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Frais</h1>
                <p>Aucune année académique trouvée. Veuillez en créer une pour gérer les frais.</p>
            </div>
        );
    }

    const frais = await FraisModel.find({ annee: annees[0]._id })
        .sort({ createdAt: -1 })
        .populate("programmes")
        .populate("annee")
        .lean();

    const tabs = annees.map((annee) => ({
        label: annee.designation,
        value: annee.slug,
        id: annee._id.toString(),
    }));

    // Serialize ObjectIds to plain strings for the client component
    const serializedFrais = JSON.parse(JSON.stringify(frais));

    return (
        <FraisClient
            initialData={serializedFrais}
            tabs={tabs}
        />
    );
}