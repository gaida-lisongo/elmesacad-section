import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FraisModel, ModaliteModel, PaiementModel } from "@/lib/models/Frais";
import { Types } from "mongoose";

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { email, matricule, modalite, reference, status } = body;
        if (!email?.trim() || !matricule?.trim() || !modalite?.trim() || !reference?.trim() || !status?.trim()) {
            return NextResponse.json({ message: "email et matricule sont requis" }, { status: 400 });
        }

        const paiement = await PaiementModel.create({ email, matricule, modalite, reference, status });
        return NextResponse.json({ data: paiement }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Échec création", error: (error as Error).message }, { status: 500 });
    }
}

// CREATION BULK OF PAYMENTS PATCH
export async function PATCH(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const newPayments = body.payments;
        if (!newPayments?.length) {
            return NextResponse.json({ message: "Aucun paiement à créer" }, { status: 400 });
        }
        const paiements = await PaiementModel.insertMany(newPayments);
        return NextResponse.json({ data: paiements }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Échec mise à jour", error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { id, email, matricule, modalite, reference, status } = body;
        if (!id?.trim() || !email?.trim() || !matricule?.trim() || !modalite?.trim() || !reference?.trim() || !status?.trim()) {
            return NextResponse.json({ message: "id, email et matricule sont requis" }, { status: 400 });
        }
        const paiement = await PaiementModel.findByIdAndUpdate(id, { email, matricule, modalite, reference, status }, { new: true });
        if (!paiement) {
            return NextResponse.json({ message: "Paiement introuvable" }, { status: 404 });
        }
        return NextResponse.json({ data: paiement }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec mise à jour", error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        await connectDB();
        const searchParams = new URL(request.url).searchParams;
        const id = searchParams.get("id");
        if (!id?.trim()) {
            return NextResponse.json({ message: "id manquant" }, { status: 400 });
        }
        const paiement = await PaiementModel.findByIdAndDelete(id);
        if (!paiement) {
            return NextResponse.json({ message: "Paiement introuvable" }, { status: 404 });
        }
        return NextResponse.json({ data: paiement }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec suppression", error: (error as Error).message }, { status: 500 });
    }
}

export async function GET(request: Request) {
    try {
        console.log('[FETCHING LIST PAIEMENTS]');
        await connectDB();
        const searchParams = new URL(request.url).searchParams;
        const email = searchParams.get("email");
        const matricule = searchParams.get("matricule");
        const modalite = searchParams.get("modalite");
        const status = searchParams.get("status");
        const offset = Number(searchParams.get("offset") ?? "0");
        const limit = Number(searchParams.get("limit") ?? "100");
        const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 100;

        let query: Record<string, unknown> = {};
        if (email?.trim()) {
            query.email = email.trim().toLowerCase();
        }
        if (matricule?.trim()) {
            query.matricule = matricule.trim();
        }

        //Convertir modalite en ObjectId si elle est présente
        if (modalite?.trim()) {
            query.modalite = new Types.ObjectId(String(modalite.trim()));
        }

        if (status?.trim()) {
            query.status = status.trim();
        }

        const paiements = await PaiementModel.find(query).populate("modalite").sort({ createdAt: -1 }).skip(safeOffset).limit(safeLimit);
        const total = await PaiementModel.countDocuments(query);

        return NextResponse.json({ data: paiements, total }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Échec chargement", error: (error as Error).message }, { status: 500 });
    }    
}