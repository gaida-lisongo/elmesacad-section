import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import { runCheckWithLogging } from "@/lib/payment/paymentRun";
import {
  extractTransactionStatusFromCheckResponse,
  mapProviderTransactionToDeposit,
} from "@/lib/payment/transactionStatus";
import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";
import { CollectCardPayload, PaymentService } from "@/lib/services/PaymentService";

type ResolutionCategorie = "TP" | "QCM";
type CommandeStatus = "pending" | "paid" | "failed" | "completed";
type CommandeTransaction = {
  orderNumber?: string;
  amount: number;
  currency: "USD" | "CDF";
  phoneNumber: string;
};

type BaseBody = {
  action: "ensure" | "pay" | "check" | "reset" | "complete" | "get";
  matricule?: string;
  email?: string;
  categorie?: ResolutionCategorie;
  reference?: string;
  commandeId?: string;
  amount?: number;
  currency?: "USD" | "CDF";
  phoneNumber?: string;
};

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

function toCategorie(value: unknown): ResolutionCategorie | null {
  const v = normalizeString(value).toUpperCase();
  if (v === "TP" || v === "QCM") return v;
  return null;
}

async function findResolutionNoteForCommande(commandeId: string): Promise<number | null> {
  const base = getTitulaireServiceBase();
  if (!base) return null;
  const upstream = await fetch(`${base}/resolutions/all`, { method: "GET", cache: "no-store" });
  if (!upstream.ok) return null;
  const payload = (await upstream.json().catch(() => ({}))) as { data?: unknown };
  const rows = Array.isArray(payload.data) ? payload.data : [];
  const row = rows.find((x) => {
    if (!x || typeof x !== "object" || Array.isArray(x)) return false;
    const o = x as Record<string, unknown>;
    return normalizeString(o.matiere) === commandeId;
  }) as Record<string, unknown> | undefined;
  if (!row) return null;
  const note = Number(row.note ?? NaN);
  return Number.isFinite(note) ? note : null;
}

async function getActiveCommande(input: {
  matricule: string;
  email: string;
  categorie: ResolutionCategorie;
  reference: string;
}) {
  return CommandeModel.findOne({
    "student.matricule": input.matricule,
    "student.email": input.email,
    "ressource.categorie": input.categorie,
    "ressource.reference": input.reference,
    status: { $in: ["pending", "paid", "completed"] satisfies CommandeStatus[] },
  }).sort({ createdAt: -1 });
}

async function syncCommandeStatusFromProvider(commande: InstanceType<typeof CommandeModel>) {
  const orderNumber = normalizeString(commande.transaction?.orderNumber);
  if (!orderNumber) {
    return { message: "Aucun orderNumber.", providerStatus: null as string | null, check: null as unknown };
  }
  const check = await runCheckWithLogging(orderNumber);
  const providerStatus = extractTransactionStatusFromCheckResponse(check);
  console.log("providerStatus", providerStatus);
  if (providerStatus != null) {
    const mapped = mapProviderTransactionToDeposit(providerStatus);
    commande.status = mapped;
    await commande.save();
  }
  return { message: "Vérification paiement effectuée.", providerStatus, check };
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = (await request.json().catch(() => ({}))) as BaseBody;
    const action = body.action;
    if (!action) return NextResponse.json({ success: false, message: "action requise." }, { status: 400 });

    if (action === "ensure" || action === "get") {
      const email = normalizeString(body.email).toLowerCase();
      const matricule = normalizeString(body.matricule);
      const categorie = toCategorie(body.categorie);
      const reference = normalizeString(body.reference);
      if (!email || !matricule || !reference || !categorie) {
        return NextResponse.json({ success: false, message: "Paramètres invalides." }, { status: 400 });
      }
      const commande = await getActiveCommande({ email, matricule, categorie, reference });
      if (!commande) {
        return NextResponse.json({ success: true, exists: false, commande: null }, { status: 200 });
      }
      if (commande.status === "pending" && normalizeString(commande.transaction.orderNumber)) {
        await syncCommandeStatusFromProvider(commande as unknown as InstanceType<typeof CommandeModel>);
      }
      const note = commande.status === "completed" ? await findResolutionNoteForCommande(String(commande._id)) : null;
      return NextResponse.json(
        {
          success: true,
          exists: true,
          commande: {
            id: String(commande._id),
            status: commande.status,
            transaction: commande.transaction,
          },
          note,
        },
        { status: 200 }
      );
    }

    if (action === "pay") {
      const phoneNumber = normalizeString(body.phoneNumber);
      const reference = normalizeString(body.reference);
      if (!phoneNumber || !reference) {
        return NextResponse.json({ success: false, message: "phoneNumber et reference requis." }, { status: 400 });
      }
      const email = normalizeString(body.email).toLowerCase();
      const matricule = normalizeString(body.matricule);
      const categorie = toCategorie(body.categorie);
      const amount = Number(body.amount ?? 0);
      const currency = body.currency === "CDF" ? "CDF" : "USD";
      if (!email || !matricule || !reference || !categorie || amount <= 0) {
        return NextResponse.json({ success: false, message: "Paramètres paiement invalides." }, { status: 400 });
      }

      const paymentPayload = {
        channel: "MOBILE_MONEY",
        amount,
        currency,
        reference,
        phone: phoneNumber,
      };

      const service = PaymentService.getInstance();
      const {
        success,
        data,
        message,
      } = await service.collect(paymentPayload as CollectCardPayload);

      if(!data || typeof data !== "object") {
        return NextResponse.json({ success: false, message: "Paiement refusé." }, { status: 400 });
      }

      const paymentData = ((data as { data?: unknown }).data ?? data) as Record<string, unknown>;

      const transaction: CommandeTransaction = {
        orderNumber: normalizeString(paymentData.orderNumber) || undefined,
        amount: Number(paymentData.amount ?? 0),
        currency: paymentData.currency === "CDF" ? "CDF" : "USD",
        phoneNumber: phoneNumber,
      };

      let commande = await CommandeModel.findOne({
        "student.email": email,
        "student.matricule": matricule,
        "ressource.categorie": categorie,
        "ressource.reference": reference,
      });

      if (commande && commande.status !== "failed") {
        const statusMessage =
          commande.status === "completed"
            ? "Ce travail est déjà soumis (commande complétée)."
            : commande.status === "paid"
              ? "Paiement déjà validé pour ce travail."
              : "Une commande de paiement existe déjà pour ce travail.";
        return NextResponse.json(
          {
            success: true,
            existing: true,
            message: statusMessage,
            commande: commande.toObject(),
          },
          { status: 200 }
        );
      }

      if (!commande) {
        commande = await CommandeModel.create({
          student: { email, matricule },
          ressource: { categorie, reference },
          transaction,
          status: "pending",
        });

        return NextResponse.json({
          success: true,
          message,
          existing: false,
          commande: commande.toObject(),
        }, { status: 200 });
      } else {
        commande.transaction = {
          ...commande.transaction,
          ...transaction,
        };
        commande.status = "pending";
        await commande.save();

        return NextResponse.json({
          success: true,
          message,
          existing: false,
          commande: commande.toObject(),
        }, { status: 200 });
      }
    }

    if (action === "check") {
      const id = normalizeString(body.commandeId);
      let commande =
        id.length > 0
          ? await CommandeModel.findById(id)
          : null;
      if (!commande) {
        const email = normalizeString(body.email).toLowerCase();
        const matricule = normalizeString(body.matricule);
        const categorie = toCategorie(body.categorie);
        const reference = normalizeString(body.reference);
        if (email && matricule && categorie && reference) {
          commande = await getActiveCommande({ email, matricule, categorie, reference });
        }
      }
      if (!commande) return NextResponse.json({ success: false, message: "Commande introuvable." }, { status: 404 });
      const { providerStatus, check } = await syncCommandeStatusFromProvider(commande as unknown as InstanceType<typeof CommandeModel>);
      return NextResponse.json(
        {
          success: true,
          commande: { id: String(commande._id), status: commande.status, transaction: commande.transaction },
          providerStatus,
          check,
        },
        { status: 200 }
      );
    }

    if (action === "reset") {
      const id = normalizeString(body.commandeId);
      if (!id) return NextResponse.json({ success: false, message: "commandeId requis." }, { status: 400 });
      const commande = await CommandeModel.findById(id);
      if (!commande) return NextResponse.json({ success: false, message: "Commande introuvable." }, { status: 404 });
      if (commande.status === "completed") {
        return NextResponse.json({ success: false, message: "Commande complétée non supprimable." }, { status: 409 });
      }
      await CommandeModel.deleteOne({ _id: commande._id });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    if (action === "complete") {
      const id = normalizeString(body.commandeId);
      if (!id) return NextResponse.json({ success: false, message: "commandeId requis." }, { status: 400 });
      const commande = await CommandeModel.findById(id);
      if (!commande) return NextResponse.json({ success: false, message: "Commande introuvable." }, { status: 404 });
      if (commande.status !== "paid" && commande.status !== "completed") {
        return NextResponse.json(
          { success: false, message: "Paiement non validé. Impossible de compléter." },
          { status: 409 }
        );
      }
      commande.status = "completed";
      await commande.save();
      return NextResponse.json({ success: true, commande: { id: String(commande._id), status: commande.status } }, { status: 200 });
    }

    return NextResponse.json({ success: false, message: "Action inconnue." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : "Erreur serveur." },
      { status: 500 }
    );
  }
}
