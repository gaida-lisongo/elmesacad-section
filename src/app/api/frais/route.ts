import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FraisModel, ModaliteModel } from "@/lib/models/Frais";
import { AnneeModel } from "@/lib/models/Annee";
// Force le chargement du modèle Annee dans le registre Mongoose
void AnneeModel;
import { Types } from "mongoose";
import { slugifyDesignation, buildUniqueSlug } from "@/lib/utils/formationSlug";

export async function GET(request: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const offset = Number(searchParams.get("offset") ?? "0");
        const limit = Number(searchParams.get("limit") ?? "50");
        const search = (searchParams.get("search") ?? "").trim();
        const annee = searchParams.get("annee") ?? "";
        const slug = searchParams.get("slug") ?? "";
        const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

        const filter: Record<string, any> = {};
        if (annee) {
            filter.annee = { $eq: new Types.ObjectId(annee) };
        }
        if (slug) {
            filter.slug = { $eq: slug };
        }
        if (search.length > 0) {
            filter.$or = [
                { designation: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
            ];
        }

        const frais = await FraisModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(safeOffset)
            .limit(safeLimit)
            .populate("annee")
            .lean();

        // Récupérer le nombre de modalités pour chaque frais
        const fraisIds = frais.map(f => f._id.toString());
        const modalitesCounts = await ModaliteModel.aggregate([
            { $match: { frais: { $in: fraisIds.map(id => new Types.ObjectId(id)) } } },
            { $group: { _id: "$frais", count: { $sum: 1 } } }
        ]);

        const countMap = new Map<string, number>();
        for (const mc of modalitesCounts) {
            countMap.set(mc._id.toString(), mc.count);
        }

        const fraisWithModalitesCount = frais.map(f => ({
            ...f,
            modalitesCount: countMap.get(f._id.toString()) ?? 0
        }));

        return NextResponse.json({ data: fraisWithModalitesCount }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to fetch frais", error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { annee, programmes, designation, montant } = body;
        if (!annee || !designation?.trim() || !montant) {
            return NextResponse.json({ message: "annee, designation and montant are required" }, { status: 400 });
        }
        const slug = await buildUniqueSlug(FraisModel, designation, { annee });
        const createData: Record<string, unknown> = { annee, designation, montant, slug };
        if (programmes?.length) {
            createData.programmes = programmes;
        }
        const frais = await FraisModel.create(createData);
        return NextResponse.json({ data: frais }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to create frais", error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { id, annee, programmes, designation, montant } = body;
        if (!id || !designation?.trim() || !montant) {
            return NextResponse.json({ message: "id, designation and montant are required" }, { status: 400 });
        }
        const updateData: Record<string, unknown> = { annee, designation, montant };
        if (programmes?.length) {
            updateData.programmes = programmes;
        }
        const frais = await FraisModel.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
        if (!frais) {
            return NextResponse.json({ message: "Frais not found" }, { status: 404 });
        }
        return NextResponse.json({ data: frais }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to update frais", error: (error as Error).message }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
    try {
        await connectDB();
        //Id from query params
        const searchParams = new URL(request.url).searchParams;
        const id = searchParams.get("id");
        if (!id || !Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid frais id" }, { status: 400 });
        }
        const deleted = await FraisModel.findByIdAndDelete(new Types.ObjectId(id));
        if (!deleted) {
            return NextResponse.json({ message: "Frais not found" }, { status: 404 });
        }
        return NextResponse.json({ ok: true }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to delete frais", error: (error as Error).message }, { status: 500 });
    }
}