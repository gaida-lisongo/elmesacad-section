"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { PercepteurModel, CommandeModel, type PercepteurDoc } from "@/lib/models/Commande";

export async function createPercepteur(data: any) {
    try {
        await connectDB();
        const percepteur = await PercepteurModel.create(data);
        return { success: true, data: JSON.parse(JSON.stringify(percepteur)) };
    } catch (error: any) {
        console.error("Erreur lors de la création du percepteur :", error);
        return { success: false, error: error.message };
    }
}

export async function updatePercepteur(id: string, data: Partial<PercepteurDoc>) {
    try {
        await connectDB();
        const percepteur = await PercepteurModel.findByIdAndUpdate(id, data, { new: true });
        return { success: true, data: JSON.parse(JSON.stringify(percepteur)) };
    } catch (error: any) {
        console.error("Erreur lors de la mise à jour du percepteur :", error);
        return { success: false, error: error.message };
    }
}

export async function deletePercepteur(id: string) {
    try {
        await connectDB();
        const percepteur = await PercepteurModel.findByIdAndDelete(id);
        return { success: true, data: JSON.parse(JSON.stringify(percepteur)) };
    } catch (error: any) {
        console.error("Erreur lors de la suppression du percepteur :", error);
        return { success: false, error: error.message };
    }

}

export async function findPercepteurs(criteria: any) {
    try {
        await connectDB();

        // 1. Récupérer les percepteurs avec l'agent populé
        const percepteurs = await PercepteurModel
            .find(criteria)
            .populate("agent")
            .populate({
                path: "commandes",
                model: CommandeModel,
            })
            .lean();

        // 2. Calculer les métriques de commandes pour chaque percepteur
        //    en filtrant uniquement les commandes liées à la ressource (criteria.ressources.reference)
        const reference = criteria?.["ressources.reference"];
        const data = percepteurs.map((p: any) => {
            const commandes = (p.commandes || []).filter(
                (c: any) => !reference || c?.ressource?.reference === reference
            );

            const totalCommandes = commandes.length;
            const totalAmount = commandes.reduce((sum: number, c: any) => sum + (c.transaction?.amount || 0), 0);
            const pendingCount = commandes.filter((c: any) => c.status === "pending" || c.status === "ok").length;
            const paidCount = commandes.filter((c: any) => c.status === "paid" || c.status === "completed").length;
            const failedCount = commandes.filter((c: any) => c.status === "failed").length;
            const paidAmount = commandes
                .filter((c: any) => c.status === "paid" || c.status === "completed")
                .reduce((sum: number, c: any) => sum + (c.transaction?.amount || 0), 0);

            return {
                ...p,
                commandes,   // commandes filtrées pour cette ressource
                stats: {
                    totalCommandes,
                    totalAmount,
                    pendingCount,
                    paidCount,
                    failedCount,
                    paidAmount,
                },
            };
        });

        return { success: true, data: JSON.parse(JSON.stringify(data)) };
    } catch (error: any) {
        console.error("Erreur lors de la recherche des percepteurs :", error);
        return { success: false, error: error.message };
    }
}