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
  ressource: {
    categorie: string;
    reference: string;
    produit: string;
    metadata?: {
      fullName?: string;
      productTitle?: string;
      [key: string]: unknown;
    };
  };
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
  _id?: string;
  categorie: string;
  reference: string;
  produit: string;
};

export type MyPercepteurInfo = {
  perceptions: any[];
  agent: any;
  allCommandes: any[];
  allRessources: any[];
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
    const docs = await PercepteurModel.find({ agent: session.sub })
    .populate("agent")
    .populate("commandes")
    .lean();
    if (!docs.length) {
      return { success: false, error: "Aucun profil percepteur trouvé pour votre compte." };
    }

    const agent = docs[0].agent as any;
    if (!agent) {
      return { success: false, error: "Données de l'agent introuvables." };
    }

    //FlatMap des commandes de tous les percepteurs de l'agent (normalement 1 seul percepteur par agent, mais on couvre le cas où il y en aurait plusieurs)
    const commandes = docs.flatMap((doc) => doc.commandes || []);
    
    //FlatMap des ressources de tous les percepteurs de l'agent (normalement 1 seul percepteur par agent, mais on couvre le cas où il y en aurait plusieurs)
    const ressources = docs.flatMap((doc) => doc.ressources || []);

    return {
      success: true,
      data: {
        perceptions: docs,
        agent,
        allCommandes: commandes,
        allRessources: ressources,
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
        { "ressource.metadata.fullName": { $regex: s, $options: "i" } },
        { "transaction.orderNumber": { $regex: s, $options: "i" } },
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
      ressource: {
        categorie: c.ressource.categorie,
        reference: c.ressource.reference,
        produit: c.ressource.produit,
        metadata: c.ressource.metadata,
      },
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
        { "ressource.metadata.fullName": { $regex: s, $options: "i" } },
        { "transaction.orderNumber": { $regex: s, $options: "i" } },
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
      ressource: {
        categorie: c.ressource.categorie,
        reference: c.ressource.reference,
        produit: c.ressource.produit,
        metadata: c.ressource.metadata,
      },
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

/* ─── Export des commandes d'une ressource (percepteur) ─ */
export async function exportPerceptionOrdersAction(args: {
  resourceId: string;
  commandesIds: string[];
  period: "daily" | "weekly" | "monthly" | "custom";
  start?: string;
  end?: string;
}) {
  try {
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent") {
      return { success: false, error: "Non autorisé." };
    }
    await connectDB();

    const match: Record<string, any> = {
      "ressource.reference": args.resourceId,
    };

    if (args.period === "custom" && args.start && args.end) {
      match.createdAt = {
        $gte: new Date(args.start + "T00:00:00.000Z"),
        $lte: new Date(args.end + "T23:59:59.999Z"),
      };
    } else {
      const now = new Date();
      let from = new Date(now);
      from.setHours(0, 0, 0, 0);
      let to = new Date(now);
      to.setHours(23, 59, 59, 999);

      if (args.period === "weekly") {
        const day = from.getDay() || 7;
        from.setDate(from.getDate() - day + 1);
      } else if (args.period === "monthly") {
        from.setDate(1);
      }

      match.createdAt = { $gte: from, $lte: to };
    }

    const [pendingDocs, paidDocs] = await Promise.all([
      CommandeModel.find({ ...match, status: "ok", _id: { $nin: args.commandesIds.map((id) => id) } }).lean(),
      CommandeModel.find({ ...match, status: "paid", _id: { $in: args.commandesIds.map((id) => id) } }).lean(),
    ]);

    const all = [...pendingDocs, ...paidDocs].sort(
      (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    const csvRows = [
      ["ID", "Matricule", "Email", "Nom", "Produit", "Référence", "Order Number", "Montant", "Devise", "Téléphone", "Statut", "Date"].join(";"),
      ...all.map((c: any) =>
        [
          c._id.toString(),
          c.student?.matricule ?? "",
          c.student?.email ?? "",
          c.ressource?.metadata?.fullName ?? "",
          c.ressource?.produit ?? "",
          c.ressource?.reference ?? "",
          c.transaction?.orderNumber ?? "",
          c.transaction?.amount ?? 0,
          c.transaction?.currency ?? "",
          c.transaction?.phoneNumber ?? "",
          c.status,
          c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "",
        ].join(";")
      ),
    ];

    return {
      success: true,
      data: {
        csv: "\uFEFF" + csvRows.join("\n"),
        filename: `commandes-${args.resourceId}-${args.period}.csv`,
      },
    };
  } catch (e: any) {
    return { success: false, error: e.message };
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