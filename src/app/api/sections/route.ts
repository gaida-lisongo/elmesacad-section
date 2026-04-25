import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";
import { generateApiKey, generateSecretKey } from "@/lib/utils/sectionKeys";
import { sectionWithoutSecrets } from "@/lib/utils/sectionResponse";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

    const [raw, total] = await Promise.all([
      SectionModel.find()
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      SectionModel.countDocuments(),
    ]);
    const data = raw.map((d) => sectionWithoutSecrets(d as Record<string, unknown>));
    return NextResponse.json(
      { data, pagination: { offset: safeOffset, limit: safeLimit, total } },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to list sections", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    await connectDB();
    const payload = await request.json();
    const {
      designation,
      email,
      website,
      telephone,
      description,
      bureau: bureauIn,
    } = payload as {
      designation?: string;
      email?: string;
      website?: string;
      telephone?: string;
      description?: { title: string; contenu: string }[];
      bureau?: {
        chefSection?: string;
        chargeEnseignement?: string;
        chargeRecherche?: string;
      };
    };

    if (!designation?.trim()) {
      return NextResponse.json({ message: "designation is required" }, { status: 400 });
    }

    const bureau: {
      chefSection?: Types.ObjectId;
      chargeEnseignement?: Types.ObjectId;
      chargeRecherche?: Types.ObjectId;
    } = {};
    if (bureauIn) {
      for (const key of ["chefSection", "chargeEnseignement", "chargeRecherche"] as const) {
        const v = bureauIn[key];
        if (!v) continue;
        if (!Types.ObjectId.isValid(v)) {
          return NextResponse.json({ message: `Invalid bureau field: ${key}` }, { status: 400 });
        }
        bureau[key] = new Types.ObjectId(v);
      }
    }

    const slug = await buildUniqueSlug(SectionModel, designation, {});
    const apiKey = generateApiKey();
    const secretKey = generateSecretKey();

    const created = await SectionModel.create({
      designation: designation.trim(),
      slug,
      email,
      website,
      telephone,
      description: description ?? [],
      apiKey,
      secretKey,
      programmes: [],
      bureau,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create section", error: (error as Error).message },
      { status: 500 }
    );
  }
}
