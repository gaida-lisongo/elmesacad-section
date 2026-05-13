import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { FraisModel } from "@/lib/models/Frais";
import { Types } from "mongoose";

export async function GET(request: Request) {
    try {
        await connectDB();
        const { searchParams } = new URL(request.url);
        const offset = Number(searchParams.get("offset") ?? "0");
        const limit = Number(searchParams.get("limit") ?? "50");
        const search = (searchParams.get("search") ?? "").trim();
        const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

        const filter =
            search.length > 0
                ? {
                    $or: [
                        { designation: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } },
                        { categories: { $in: search.split(",").map((x) => x.trim()) } },
                    ],
                }
                : {};

        const frais = await FraisModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(safeOffset)
            .limit(safeLimit);

        return NextResponse.json({ data: frais }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to fetch frais", error: (error as Error).message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { categories, designation, montant } = body;
        if (!categories?.length || !designation?.trim() || !montant) {
            return NextResponse.json({ message: "categories, designation and montant are required" }, { status: 400 });
        }
        const frais = await FraisModel.create({ categories, designation, montant, paiements: [] });
        return NextResponse.json({ data: frais }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to create frais", error: (error as Error).message }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const { id, categories, designation, montant, paiements } = body;
        if (!id || !categories?.length || !designation?.trim() || !montant) {
            return NextResponse.json({ message: "id, categories, designation and montant are required" }, { status: 400 });
        }
        const frais = await FraisModel.findByIdAndUpdate(id, { categories, designation, montant, paiements }, { new: true });
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
        const { id } = await request.json()
        if (!Types.ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid frais id" }, { status: 400 });
        }
        const deleted = await FraisModel.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ message: "Frais not found" }, { status: 404 });
        }
        return NextResponse.json({ data: deleted }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ message: "Failed to delete frais", error: (error as Error).message }, { status: 500 });
    }
}