// GET /api/frais/[slug]
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FraisModel, ModaliteModel, PaiementModel } from "@/lib/models/Frais";
import { Types } from "mongoose";
import { slugifyDesignation, buildUniqueSlug } from "@/lib/utils/formationSlug";


export async function GET(_: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        await connectDB();
        const { slug } = await context.params;
        if (!slug?.trim()) {
            return NextResponse.json({ message: "slug manquant" }, { status: 400 });
        }
        const frais = await FraisModel.findOne({ slug: slug.trim() }).populate("annee").lean();
        if (!frais) {
            return NextResponse.json({ message: "Frais introuvable" }, { status: 404 });
        }

        let modalites = await ModaliteModel.find({ frais: frais._id }).lean();
        let paiements = await PaiementModel.find({ modalite: { $in: modalites.map((modalite) => modalite._id) } }).lean();
        return NextResponse.json({ 
            data: {
                ...frais,
                modalites: modalites.map((modalite) => ({
                    ...modalite,
                    paiements: paiements.filter((paiement) => paiement.modalite.toString() === modalite._id.toString()),
                })),
            },
            metrics: {
                total_modalites: modalites.length,
                amount_modalites: modalites.reduce((acc, modalite) => acc + modalite.montant, 0),
                total_paiements: paiements.length,
                amount_paiements: paiements.reduce((acc, paiement) => acc + paiement.montant, 0),
                total_paiements_pending: paiements.filter((paiement) => paiement.status === 'pending').length,
                total_paiements_paid: paiements.filter((paiement) => paiement.status === 'paid').length,
                total_paiements_failed: paiements.filter((paiement) => paiement.status === 'failed').length,
                total_paiements_completed: paiements.filter((paiement) => paiement.status === 'completed').length,
            } 
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec chargement", error: (error as Error).message }, { status: 500 });
    }
}

// ENDPOINT TO CHECK IF A PAYMENT HAS BEEN MADE FOR A MODALITE (PATCH)
export async function PATCH(request: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        await connectDB();
        const body = await request.json();
        const { email, matricule } = body;
        const { slug } = await context.params;
        if (!slug?.trim() || !email?.trim() || !matricule?.trim()) {
            return NextResponse.json({ message: "slug, email et matricule sont requis" }, { status: 400 });
        }
        const modalite = await ModaliteModel.findOne({ slug: slug.trim() }).lean();
        if (!modalite) {
            return NextResponse.json({ message: "Modalite introuvable" }, { status: 404 });
        }
        const paiement = await PaiementModel.findOne({ modalite: modalite._id, email: email.trim().toLowerCase(), matricule: matricule.trim() }).lean();
        return NextResponse.json({ data: {
            exists: Boolean(paiement),
            paiement: paiement ? {
                _id: paiement._id.toString(),
                modalite: paiement.modalite.toString(),
                email: paiement.email,
                matricule: paiement.matricule,
                reference: paiement.reference,
                status: paiement.status,
            } : null,
            modalite: {
                _id: modalite._id.toString(),
                designation: modalite.designation,
                montant: modalite.montant,
                slug: modalite.slug,
                description: modalite.description,
            },
        } }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec vérification", error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        await connectDB();
        const body = await request.json();
        const { slug } = await context.params;
        if (!slug?.trim()) {
            return NextResponse.json({ message: "slug manquant" }, { status: 400 });
        }
        const frais = await FraisModel.findOne({ slug: slug.trim() }).populate("annee").lean();
        if (!frais) {
            return NextResponse.json({ message: "Frais introuvable" }, { status: 404 });
        }
        
        const { designation, montant, description } = body;
        if (!designation?.trim() || !montant) {
            return NextResponse.json({ message: "designation et montant sont requis" }, { status: 400 });
        }
        const modalite_slug = await buildUniqueSlug(ModaliteModel, designation, { frais: frais._id });
        const modalite = await ModaliteModel.create({ frais: frais._id, designation, montant, slug: modalite_slug, description });
        return NextResponse.json({ data: modalite }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Échec création", error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        await connectDB();
        const body = await request.json();
        const { slug } = await context.params;
        if (!slug?.trim()) {
            return NextResponse.json({ message: "slug manquant" }, { status: 400 });
        }
        
        const modalite = await ModaliteModel.findOne({ slug: slug.trim() }).lean();
        if (!modalite) {
            return NextResponse.json({ message: "Modalite introuvable" }, { status: 404 });
        }
        const { designation, montant, description } = body;
        if (!designation?.trim() || !montant) {
            return NextResponse.json({ message: "designation et montant sont requis" }, { status: 400 });
        }
        const modaliteUpdated = await ModaliteModel.findByIdAndUpdate(modalite._id, { designation, montant, description }, { new: true });
        return NextResponse.json({ data: modaliteUpdated }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec mise à jour", error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request, context: { params: Promise<{ slug: string }> }) {
    try {
        await connectDB();
        const { slug } = await context.params;
        if (!slug?.trim()) {
            return NextResponse.json({ message: "slug manquant" }, { status: 400 });
        }
        const modalite = await ModaliteModel.findOne({ slug: slug.trim() }).lean();
        if (!modalite) {
            return NextResponse.json({ message: "Modalite introuvable" }, { status: 404 });
        }
        await ModaliteModel.findByIdAndDelete(modalite._id);
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec suppression", error: (error as Error).message }, { status: 500 });
    }
}