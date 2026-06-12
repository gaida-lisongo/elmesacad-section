"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { PercepteurModel, type PercepteurDoc } from "@/lib/models/Commande";

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

export async function findPercepteurs(criteria: any){
    try {
        await connectDB();
        const percepteurs = await PercepteurModel.find(criteria);
        return { success: true, data: JSON.parse(JSON.stringify(percepteurs)) };
    } catch (error: any) {
        console.error("Erreur lors de la recherche des percepteurs :", error);
        return { success: false, error: error.message };
    }
}