"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel, PercepteurModel } from "@/lib/models/Commande";
import { getSessionPayload } from "@/lib/auth/sessionServer";

/* ─── Types ─────────────────────────────────────────── */
export type PerceptionOrderRow = {
  _id: string;
  student: { matricule: string; email: string };
  ressource: { categorie: string; reference: string; produit: string; metadata?: Record<string, unknown> };
  transaction: {
    orderNumber?: string;
    amount: number;
    currency: string;
    phoneNumber: string;
  };
  status: string;
  createdAt: string;
};

/* ─── Récupérer le percepteur lié à l'agent connecté ── */
export async function getMyPercepteur() {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") {
      return { success: false, error: "Non autorisé." };
    }
    await connectDB();
    const doc = await PercepteurModel.findOne({ agent: session.sub }).populate("agent").lean();
    if (!doc) {
      return { success: false, error: "Aucun profil percepteur trouvé pour votre compte." };
    }
    return { success: true, data: JSON.parse(JSON.stringify(doc)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ─── Lister les commandes avec pagination ──────────── */
export async function listPerceptionOrdersAction(args: {
  resourceId: string;
  status: "ok" | "paid";
  page: number;
  limit: number;
  search?: string;
}) {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") {
      throw new Error("Non autorisé.");
    }
    await connectDB();

    const match: Record<string, unknown> = {
      "ressource.reference": args.resourceId,
      status: args.status,
    };

    // Recherche par nom ou matricule
    if (args.search?.trim()) {
      const s = args.search.trim();
      match.$or = [
        { "student.matricule": { $regex: s, $options: "i" } },
        { "student.email": { $regex: s, $options: "i" } },
      ];
    }

    const total = await CommandeModel.countDocuments(match);
    const docs = await CommandeModel.find(match)
      .sort({ createdAt: -1 })
      .skip((args.page - 1) * args.limit)
      .limit(args.limit)
      .lean();

    const rows: PerceptionOrderRow[] = docs.map((c: any) => ({
      _id: c._id.toString(),
      student: c.student,
      ressource: c.ressource,
      transaction: {
        orderNumber: c.transaction?.orderNumber ?? "",
        amount: c.transaction?.amount ?? 0,
        currency: c.transaction?.currency ?? "USD",
        phoneNumber: c.transaction?.phoneNumber ?? "",
      },
      status: c.status,
      createdAt: c.createdAt?.toISOString?.() ?? String(c.createdAt),
    }));

    return { success: true, rows, total, page: args.page, limit: args.limit };
  } catch (e: any) {
    return { success: false, error: e.message, rows: [], total: 0, page: 1, limit: args.limit };
  }
}

/* ─── Valider une commande (ok → paid) + attacher au percepteur ── */
export async function validateOrderAction(orderId: string) {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") {
      return { success: false, error: "Non autorisé." };
    }
    await connectDB();

    // 1. Trouver le percepteur de l'agent connecté
    const percepteur = await PercepteurModel.findOne({ agent: session.sub });
    if (!percepteur) {
      return { success: false, error: "Aucun profil percepteur trouvé." };
    }

    // 2. Mettre à jour la commande
    const order = await CommandeModel.findByIdAndUpdate(
      orderId,
      { status: "paid" },
      { new: true }
    ).lean();

    if (!order) {
      return { success: false, error: "Commande introuvable." };
    }

    // 3. Ajouter l'ID de la commande au percepteur si pas déjà présent
    const oid = order._id as any;
    if (!percepteur.commandes.some((cId: any) => String(cId) === String(oid))) {
      await PercepteurModel.findByIdAndUpdate(percepteur._id, {
        $push: { commandes: oid },
      });
    }

    revalidatePath("/section/perception");

    return { success: true, data: JSON.parse(JSON.stringify(order)) };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ─── Stats pour le header ──────────────────────────── */
export async function getPerceptionStatsAction(resourceId: string) {
  try {
    await connectDB();
    const [pending, paid, total] = await Promise.all([
      CommandeModel.countDocuments({ "ressource.reference": resourceId, status: "ok" }),
      CommandeModel.countDocuments({ "ressource.reference": resourceId, status: "paid" }),
      CommandeModel.countDocuments({ "ressource.reference": resourceId }),
    ]);

    const pendingAmount = await CommandeModel.aggregate([
      { $match: { "ressource.reference": resourceId, status: "ok" } },
      { $group: { _id: null, total: { $sum: "$transaction.amount" } } },
    ]);

    const paidAmount = await CommandeModel.aggregate([
      { $match: { "ressource.reference": resourceId, status: "paid" } },
      { $group: { _id: null, total: { $sum: "$transaction.amount" } } },
    ]);

    return {
      success: true,
      data: {
        pending,
        paid,
        total,
        pendingAmount: pendingAmount[0]?.total ?? 0,
        paidAmount: paidAmount[0]?.total ?? 0,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}