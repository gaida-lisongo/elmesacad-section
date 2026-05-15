import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FraisModel } from "@/lib/models/Frais";
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

        const filter =
            search.length > 0
                ? {
                    $or: [
                        { designation: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
                        { annee: { $eq: new Types.ObjectId(annee) } },
                        { slug: { $eq: slug } },
                        { programmes: { $in: search.split(",").map((x) => x.trim()) } },
                    ],
                }
                : {};

        const frais = await FraisModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(safeOffset)
            .limit(safeLimit)
            .populate("programmes")
            .populate("annee")
            .lean();

        return NextResponse.json({ data: frais }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to fetch frais", error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { annee, programmes, designation, montant } = body;
        if (!annee || !programmes?.length || !designation?.trim() || !montant) {
            return NextResponse.json({ message: "annee, programmes, designation and montant are required" }, { status: 400 });
        }
        const slug = await buildUniqueSlug(FraisModel, designation, { annee, programmes });
        const frais = await FraisModel.create({ annee, programmes, designation, montant, slug });
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
        if (!id || !programmes?.length || !designation?.trim() || !montant) {
            return NextResponse.json({ message: "id, programmes, designation and montant are required" }, { status: 400 });
        }
        const frais = await FraisModel.findByIdAndUpdate(id, { annee, programmes, designation, montant }, { new: true });
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