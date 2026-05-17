"use server";

import { Types } from "mongoose";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { RessourceFraisModel, ModaliteModel } from "@/lib/models/Frais";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";

export type ResourceType = "session" | "validation" | "releve" | "labo";

export type RessourceFraisRow = {
  id: string;
  ressource: {
    type: string;
    designation: string;
    _id: string;
  };
  modalites: {
    id: string;
    designation: string;
    montant: number;
    slug: string;
    frais: {
      designation: string;
      montant: number;
      slug: string;
    };
  }[];
  totalMontant: number;
  createdAt: string;
  updatedAt: string;
};

export type ModaliteOption = {
  id: string;
  designation: string;
  montant: number;
  slug: string;
  fraisDesignation: string;
};

async function assertGestionnaire() {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    throw new Error("Accès réservé aux gestionnaires.");
  }
  await connectDB();
  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope?.sectionSlug) {
    throw new Error("Aucune section locale trouvée pour ce gestionnaire.");
  }
  return scope;
}

function serializeRessourceFrais(doc: any): RessourceFraisRow {
  const modalites = (doc.modalites || []).map((m: any) => ({
    id: m._id?.toString?.() || m.id || String(Math.random()).slice(2),
    designation: String(m.designation ?? ""),
    montant: Number(m.montant ?? 0),
    slug: String(m.slug ?? ""),
    frais: {
      designation: String(m.frais?.designation ?? ""),
      montant: Number(m.frais?.montant ?? 0),
      slug: String(m.frais?.slug ?? ""),
    },
  }));

  return {
    id: doc._id.toString(),
    ressource: {
      type: String(doc.ressource?.type ?? ""),
      designation: String(doc.ressource?.designation ?? ""),
      _id: String(doc.ressource?._id ?? ""),
    },
    modalites,
    totalMontant: modalites.reduce((sum: number, m: any) => sum + (m.montant || 0), 0),
    createdAt: doc.createdAt?.toISOString?.() ?? String(doc.createdAt ?? ""),
    updatedAt: doc.updatedAt?.toISOString?.() ?? String(doc.updatedAt ?? ""),
  };
}

/** Liste les RessourceFrais pour un type donné */
export async function listRessourceFraisAction(input: {
  resourceType: ResourceType;
  resourceIds?: string[];
}): Promise<{ rows: RessourceFraisRow[] }> {
  await assertGestionnaire();
  const { resourceType, resourceIds } = input;

  const query: any = { "ressource.type": resourceType };
  if (resourceIds && resourceIds.length > 0) {
    query["ressource._id"] = { $in: resourceIds };
  }

  const docs = await RessourceFraisModel.find(query).sort({ updatedAt: -1 }).lean();
  return { rows: docs.map(serializeRessourceFrais) };
}

/** Récupère un RessourceFrais par ID de ressource */
export async function getRessourceFraisByResourceIdAction(input: {
  resourceType: ResourceType;
  resourceId: string;
}): Promise<RessourceFraisRow | null> {
  await assertGestionnaire();
  const { resourceType, resourceId } = input;

  const doc = await RessourceFraisModel.findOne({
    "ressource.type": resourceType,
    "ressource._id": resourceId,
  }).lean();

  if (!doc) return null;
  return serializeRessourceFrais(doc);
}

/** Crée ou met à jour les modalités d'une ressource */
export async function upsertRessourceFraisAction(input: {
  resourceType: ResourceType;
  resourceId: string;
  resourceDesignation: string;
  modaliteIds: string[];
}): Promise<RessourceFraisRow> {
  const scope = await assertGestionnaire();
  const { resourceType, resourceId, resourceDesignation, modaliteIds } = input;

  if (!resourceId) throw new Error("ID ressource requis.");
  if (!modaliteIds || modaliteIds.length === 0) {
    throw new Error("Sélectionnez au moins une modalité.");
  }

  // Récupérer les modalités complètes
  const modalitesDocs = await ModaliteModel.find({
    _id: { $in: modaliteIds.map((id) => new Types.ObjectId(id)) },
  })
    .populate("frais", "designation montant slug")
    .lean();

  if (modalitesDocs.length === 0) {
    throw new Error("Aucune modalité trouvée.");
  }

  const modalites = modalitesDocs.map((m: any) => ({
    designation: String(m.designation ?? ""),
    montant: Number(m.montant ?? 0),
    slug: String(m.slug ?? ""),
    frais: {
      designation: String(m.frais?.designation ?? ""),
      montant: Number(m.frais?.montant ?? 0),
      slug: String(m.frais?.slug ?? ""),
    },
  }));

  const existing = await RessourceFraisModel.findOne({
    "ressource.type": resourceType,
    "ressource._id": resourceId,
  });

  let doc;
  if (existing) {
    existing.modalites = modalites;
    existing.ressource = {
      type: resourceType,
      designation: resourceDesignation,
      _id: resourceId,
    };
    doc = await existing.save();
  } else {
    doc = await RessourceFraisModel.create({
      ressource: {
        type: resourceType,
        designation: resourceDesignation,
        _id: resourceId,
      },
      modalites,
    });
  }

  return serializeRessourceFrais(doc);
}

/** Supprime un RessourceFrais */
export async function deleteRessourceFraisAction(input: {
  id: string;
}): Promise<void> {
  await assertGestionnaire();
  const { id } = input;

  if (!id) throw new Error("ID requis.");
  await RessourceFraisModel.findByIdAndDelete(id);
}

/** Liste toutes les modalités disponibles */
export async function listModalitesForRessourceFraisAction(): Promise<{ rows: ModaliteOption[] }> {
  await assertGestionnaire();

  const docs = await ModaliteModel.find()
    .populate("frais", "designation montant slug")
    .sort({ designation: 1 })
    .lean();

  return {
    rows: docs.map((m: any) => ({
      id: m._id.toString(),
      designation: String(m.designation ?? ""),
      montant: Number(m.montant ?? 0),
      slug: String(m.slug ?? ""),
      fraisDesignation: String(m.frais?.designation ?? ""),
    })),
  };
}
