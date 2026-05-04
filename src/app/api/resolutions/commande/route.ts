import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import type { CommandeDoc } from "@/lib/models/Commande";
import type { CommandeProduit } from "@/lib/constants/commandeProduit";
import { isCommandeProduit } from "@/lib/constants/commandeProduit";
import {
  collectMobileMoneyForCommande,
  ensureRechargeForCommandeAfterCollect,
  syncCommandePaymentStatusFromProvider,
  type CommandePaymentTransaction,
} from "@/lib/commande/commandePayment";
import { sendMarketplaceCommandePendingMail } from "@/lib/mail/marketplaceCommandeMail";
import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";
import { summarizeCommandeForClient } from "@/lib/commande/summarizeCommandeForClient";

type CommandeStatus = "pending" | "paid" | "failed" | "completed";

type BaseBody = {
  action: "ensure" | "pay" | "check" | "reset" | "complete" | "get" | "getById";
  matricule?: string;
  email?: string;
  /** Activités : QCM | TP. Ressources : ligne SUJET, STAGE, … (cohérent avec `produit`). */
  categorie?: string;
  reference?: string;
  commandeId?: string;
  amount?: number;
  currency?: "USD" | "CDF";
  phoneNumber?: string;
  produit?: string;
  metadata?: Record<string, unknown>;
};

function normalizeString(value: unknown): string {
  return String(value ?? "").trim();
}

const LINE_BY_PRODUIT: Partial<Record<CommandeProduit, string>> = {
  sujet: "SUJET",
  stage: "STAGE",
  "fiche-validation": "VALIDATION",
  releve: "RELEVE",
  laboratoire: "LABO",
  session: "SESSION",
  recours: "RECOURS",
};

/** Lignes `ressource.categorie` valides (marketplace + activités) quand `produit` est absent ou incohérent. */
const KNOWN_RESOURCE_CATEGORIES = new Set([
  "QCM",
  "TP",
  "SUJET",
  "STAGE",
  "VALIDATION",
  "RELEVE",
  "LABO",
  "SESSION",
  "RECOURS",
]);

function resolveRessourceCategorie(body: BaseBody): string | null {
  const produit = isCommandeProduit(body.produit) ? body.produit : null;
  const rawCat = normalizeString(body.categorie).toUpperCase();

  if (produit === "activite") {
    return rawCat === "QCM" || rawCat === "TP" ? rawCat : null;
  }

  if (produit) {
    const line = LINE_BY_PRODUIT[produit];
    if (!line) return null;
    if (rawCat && rawCat !== line) return null;
    return line;
  }

  if (rawCat === "QCM" || rawCat === "TP") return rawCat;
  if (KNOWN_RESOURCE_CATEGORIES.has(rawCat)) return rawCat;

  return null;
}

function defaultProduitFromLine(line: string): CommandeProduit {
  const u = line.toUpperCase();
  if (u === "QCM" || u === "TP") return "activite";
  const inv: Record<string, CommandeProduit> = {
    SUJET: "sujet",
    STAGE: "stage",
    VALIDATION: "fiche-validation",
    RELEVE: "releve",
    LABO: "laboratoire",
    SESSION: "session",
    RECOURS: "recours",
  };
  return inv[u] ?? "activite";
}

function mergeCommandeTransaction(
  existing: CommandeDoc["transaction"],
  incoming: CommandePaymentTransaction
): CommandeDoc["transaction"] {
  const mergedOn =
    normalizeString(incoming.orderNumber) || normalizeString(existing?.orderNumber) || undefined;
  return {
    ...existing,
    ...incoming,
    orderNumber: mergedOn,
    providerResponses: {
      ...existing?.providerResponses,
      ...incoming.providerResponses,
    },
    microserviceResponse: existing?.microserviceResponse,
  };
}

function normalizeMetadata(raw: unknown): Record<string, unknown> {
  if (raw != null && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
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
  categorie: string;
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

function queueCommandePendingEmail(body: BaseBody, commandeId: string): void {
  const email = normalizeString(body.email).toLowerCase();
  if (!email) return;
  const meta = normalizeMetadata(body.metadata);
  const title = String(meta.productTitle ?? "").trim() || "Votre commande INBTP";
  const studentName = String(meta.fullName ?? "").trim();
  void sendMarketplaceCommandePendingMail({
    to: email,
    studentName: studentName || undefined,
    commandeId,
    productLabel: title,
  }).catch((e) => console.error("[commande] email reprise:", e));
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const body = (await request.json().catch(() => ({}))) as BaseBody;
    const action = body.action;
    if (!action) return NextResponse.json({ success: false, message: "action requise." }, { status: 400 });

    if (action === "getById") {
      const id = normalizeString(body.commandeId);
      if (!id) return NextResponse.json({ success: false, message: "commandeId requis." }, { status: 400 });
      const commande = await CommandeModel.findById(id).lean();
      if (!commande) return NextResponse.json({ success: false, message: "Commande introuvable." }, { status: 404 });
      return NextResponse.json({
        success: true,
        commande: summarizeCommandeForClient(commande),
      });
    }

    if (action === "ensure" || action === "get") {
      const email = normalizeString(body.email).toLowerCase();
      const matricule = normalizeString(body.matricule);
      const categorie = resolveRessourceCategorie(body);
      const reference = normalizeString(body.reference);
      if (!email || !matricule || !reference || !categorie) {
        return NextResponse.json({ success: false, message: "Paramètres invalides." }, { status: 400 });
      }
      const commande = await getActiveCommande({ email, matricule, categorie, reference });
      if (!commande) {
        return NextResponse.json({ success: true, exists: false, commande: null }, { status: 200 });
      }
      if (commande.status === "pending" && normalizeString(commande.transaction.orderNumber)) {
        await syncCommandePaymentStatusFromProvider(commande);
      }
      const lineId = String(commande._id);
      const note =
        commande.status === "completed" ? await findResolutionNoteForCommande(lineId) : null;
      return NextResponse.json(
        {
          success: true,
          exists: true,
          commande: {
            id: lineId,
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
        console.warn("[marketplace-pay] pay refusé (champs requis)", { hasPhone: Boolean(phoneNumber), hasRef: Boolean(reference) });
        return NextResponse.json({ success: false, message: "phoneNumber et reference requis." }, { status: 400 });
      }
      const email = normalizeString(body.email).toLowerCase();
      const matricule = normalizeString(body.matricule);
      const categorie = resolveRessourceCategorie(body);
      const amount = Number(body.amount ?? 0);
      const currency = body.currency === "CDF" ? "CDF" : "USD";
      if (!email || !matricule || !reference || !categorie || amount <= 0) {
        console.warn(
          "[marketplace-pay] pay refusé — validation locale (PAS encore service paiement)",
          JSON.stringify({
            hasEmail: Boolean(email),
            hasMatricule: Boolean(matricule),
            hasReference: Boolean(reference),
            categorieResolue: categorie,
            amount,
            bodyCategorie: body.categorie,
            bodyProduit: body.produit,
          })
        );
        return NextResponse.json(
          {
            success: false,
            message: "Paramètres paiement invalides.",
            hint: !categorie
              ? "Catégorie ressource non reconnue (vérifiez categorie + produit, ex. RELEVE + releve)."
              : amount <= 0
                ? "Montant invalide."
                : undefined,
            received: {
              categorie: body.categorie,
              produit: body.produit,
              amount: body.amount,
            },
          },
          { status: 400 }
        );
      }

      const produit: CommandeProduit = isCommandeProduit(body.produit)
        ? body.produit
        : defaultProduitFromLine(categorie);
      const metadata = normalizeMetadata(body.metadata);

      let collect: { message?: string };
      let transaction: CommandePaymentTransaction;
      try {
        console.info(
          "[marketplace-pay] appel collectMobileMoneyForCommande → PAYMENT_SERVICE (FlexPay / proxy)",
          JSON.stringify({
            amount,
            currency,
            reference,
            phoneDigits: phoneNumber.replace(/\D/g, "").length,
          })
        );
        const out = await collectMobileMoneyForCommande({
          amount,
          currency,
          reference,
          phoneNumber,
        });
        collect = { message: out.response.message };
        transaction = out.transaction;
        console.info(
          "[marketplace-pay] collect OK — réponse fournisseur acceptée, création / mise à jour commande",
          JSON.stringify({
            providerMessage: out.response.message,
            orderNumber: out.transaction.orderNumber ?? null,
          })
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Paiement refusé.";
        console.error(
          "[marketplace-pay] ÉCHEC côté service de paiement (PAYMENT_SERVICE) ou réseau vers lui",
          JSON.stringify({
            error: msg,
            name: e instanceof Error ? e.name : "unknown",
            hint: "Vérifier PAYMENT_SERVICE, auth token, logs [PAYMENT_SERVICE] ci-dessus dans la même requête.",
          })
        );
        return NextResponse.json(
          { success: false, message: msg },
          { status: 400 }
        );
      }

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

      const ressourceBlock = {
        categorie,
        reference,
        produit,
        metadata,
      };

      if (!commande) {
        commande = await CommandeModel.create({
          student: { email, matricule },
          ressource: ressourceBlock,
          transaction,
          status: "pending",
        });
        await ensureRechargeForCommandeAfterCollect(commande);
        queueCommandePendingEmail(body, String(commande._id));
        return NextResponse.json(
          {
            success: true,
            message: collect.message,
            existing: false,
            commande: commande.toObject(),
          },
          { status: 200 }
        );
      }

      commande.ressource = {
        ...commande.ressource,
        ...ressourceBlock,
        produit: commande.ressource?.produit ?? produit,
        metadata: { ...(commande.ressource?.metadata ?? {}), ...metadata },
      };
      commande.transaction = mergeCommandeTransaction(commande.transaction, transaction);
      commande.status = "pending";
      await commande.save();
      await ensureRechargeForCommandeAfterCollect(commande);
      queueCommandePendingEmail(body, String(commande._id));

      return NextResponse.json(
        {
          success: true,
          message: collect.message,
          existing: false,
          commande: commande.toObject(),
        },
        { status: 200 }
      );
    }

    if (action === "check") {
      const id = normalizeString(body.commandeId);
      let commande = id.length > 0 ? await CommandeModel.findById(id) : null;
      if (!commande) {
        const email = normalizeString(body.email).toLowerCase();
        const matricule = normalizeString(body.matricule);
        const categorie = resolveRessourceCategorie(body);
        const reference = normalizeString(body.reference);
        if (email && matricule && categorie && reference) {
          commande = await getActiveCommande({ email, matricule, categorie, reference });
        }
      }
      if (!commande) return NextResponse.json({ success: false, message: "Commande introuvable." }, { status: 404 });
      const { providerStatus, check } = await syncCommandePaymentStatusFromProvider(commande);
      return NextResponse.json(
        {
          success: true,
          commande: summarizeCommandeForClient(commande.toObject()),
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
