"use server";

import { revalidatePath } from "next/cache";
import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel, PercepteurModel } from "@/lib/models/Commande";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { Types } from "mongoose";

/* ─── Types ─────────────────────────────────────────── */
export type PerceptionOrderRow = {
  _id: string;
  student: { matricule: string; email: string };
  ressource: { categorie: string; reference: string; produit: string };
  transaction: {
    orderNumber?: string;
    amount: number;
    currency: string;
    phoneNumber: string;
  };
  status: string;
  createdAt: string;
};

export type PercepteurRessource = {
  _id: string;
  categorie: string;
  reference: string;
  produit: string;
};

export type MyPercepteurInfo = {
  _id: string;
  agent: { _id: string; name: string; email: string; matricule: string };
  ressources: PercepteurRessource[];
  commandes: string[];
};

/* ─── Récupérer le percepteur de l'agent connecté ──── */
export async function getMyPercepteur(): Promise<{
  success: boolean;
  data?: MyPercepteurInfo;
  error?: string;
}> {
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
    const p = doc as any;
    return {
      success: true,
      data: {
        _id: p._id.toString(),
        agent: {
          _id: p.agent?._id?.toString?.() ?? p.agent?.toString?.() ?? session.sub,
          name: p.agent?.name ?? "N/A",
          email: p.agent?.email ?? "N/A",
          matricule: p.agent?.matricule ?? "N/A",
        },
        ressources: (p.ressources || []).map((r: any) => ({
          _id: r._id?.toString?.() ?? "",
          categorie: r.categorie,
          reference: r.reference,
          produit: r.produit,
        })),
        commandes: (p.commandes || []).map((c: any) => c.toString?.() ?? String(c)),
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/* ─── Commandes en attente (status=ok, pas encore dans percepteur.commandes) ── */
export async function listPendingOrdersAction(args: {
  resourceId: string;
  percepteurId: string;
  commandesIds: string[];
  page: number;
  limit: number;
  search?: string;
}) {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") throw new Error("Non autorisé.");
    await connectDB();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: Record<string, any> = {
      "ressource.reference": args.resourceId,
      status: "ok",
      _id: { $nin: args.commandesIds.map((id) => id) },
    };

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
      ressource: { categorie: c.ressource.categorie, reference: c.ressource.reference, produit: c.ressource.produit },
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

/* ─── Commandes validées (IDs dans percepteur.commandes) ── */
export async function listValidatedOrdersAction(args: {
  resourceId: string;
  commandesIds: string[];
  page: number;
  limit: number;
  search?: string;
}) {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") throw new Error("Non autorisé.");
    await connectDB();

    if (args.commandesIds.length === 0) {
      return { success: true, rows: [], total: 0, page: 1, limit: args.limit };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const match: Record<string, any> = {
      "ressource.reference": args.resourceId,
      status: "paid",
      _id: { $in: args.commandesIds.map((id) => id) },
    };

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
      ressource: { categorie: c.ressource.categorie, reference: c.ressource.reference, produit: c.ressource.produit },
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

/* ─── Valider une commande : status ok→paid + attacher au percepteur ── */
export async function validateOrderAction(orderId: string) {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") {
      return { success: false, error: "Non autorisé." };
    }
    await connectDB();

    const percepteur = await PercepteurModel.findOne({ agent: session.sub });
    if (!percepteur) {
      return { success: false, error: "Aucun profil percepteur trouvé." };
    }

    const order = await CommandeModel.findByIdAndUpdate(
      orderId,
      { status: "paid" },
      { new: true }
    ).lean();

    if (!order) {
      return { success: false, error: "Commande introuvable." };
    }

    const oid = order._id as any;
    const alreadyAttached = percepteur.commandes.some(
      (cId: any) => String(cId) === String(oid)
    );

    if (!alreadyAttached) {
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

/* ─── Stats ──────────────────────────────────────────── */
export async function getPerceptionStatsAction(args: {
  resourceId: string;
  commandesIds: string[];
}) {
  try {
    await connectDB();

    const pendingMatch: Record<string, any> = {
      "ressource.reference": args.resourceId,
      status: "ok",
      _id: { $nin: args.commandesIds.map((id) => id) },
    };

    const paidMatch: Record<string, any> = {
      "ressource.reference": args.resourceId,
      status: "paid",
      _id: { $in: args.commandesIds.map((id) => id) },
    };

    const [pending, paid] = await Promise.all([
      CommandeModel.countDocuments(pendingMatch),
      CommandeModel.countDocuments(paidMatch),
    ]);

    const pendingAmountAgg = await CommandeModel.aggregate([
      { $match: { "ressource.reference": args.resourceId, status: "ok", _id: { $nin: args.commandesIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: null, total: { $sum: "$transaction.amount" } } },
    ]);

    const paidAmountAgg = await CommandeModel.aggregate([
      { $match: { "ressource.reference": args.resourceId, status: "paid", _id: { $in: args.commandesIds.map((id) => new Types.ObjectId(id)) } } },
      { $group: { _id: null, total: { $sum: "$transaction.amount" } } },
    ]);

    return {
      success: true,
      data: {
        pending,
        paid,
        total: pending + paid,
        pendingAmount: pendingAmountAgg[0]?.total ?? 0,
        paidAmount: paidAmountAgg[0]?.total ?? 0,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}