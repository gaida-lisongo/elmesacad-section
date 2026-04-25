import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { buildUniqueSlug } from "@/lib/utils/formationSlug";
import { generateApiKey, generateSecretKey } from "@/lib/utils/sectionKeys";
import { sectionWithoutSecrets } from "@/lib/utils/sectionResponse";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";
import { STUDENT_CYCLES } from "@/lib/constants/studentCycles";

const CYCLES = new Set<string>([...STUDENT_CYCLES]);

export async function GET(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const cycle = searchParams.get("cycle")?.trim();
    const search = searchParams.get("search")?.trim();

    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 50;

    const filter: Record<string, unknown> = {};
    if (cycle && cycle !== "all") {
      filter.cycle = cycle;
    }
    if (search) {
      filter.$or = [
        { designation: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const [raw, total] = await Promise.all([
      SectionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(safeOffset)
        .limit(safeLimit)
        .lean()
        .exec(),
      SectionModel.countDocuments(filter),
    ]);
    const data = raw.map((d) => sectionWithoutSecrets(d as unknown as Record<string, unknown>));
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
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  try {
    await connectDB();
    const payload = await request.json();
    const {
      designation,
      email,
      website,
      telephone,
      description: descriptionIn,
      descriptionText,
      bureau: bureauIn,
      cycle: cycleIn,
      logo: logoIn,
    } = payload as {
      designation?: string;
      email?: string;
      website?: string;
      telephone?: string;
      description?: { title: string; contenu: string }[];
      descriptionText?: string;
      bureau?: {
        chefSection?: string;
        chargeEnseignement?: string;
        chargeRecherche?: string;
      };
      cycle?: string;
      logo?: string;
    };

    if (!designation?.trim()) {
      return NextResponse.json({ message: "designation is required" }, { status: 400 });
    }

    const cycle = cycleIn?.trim() ?? "";
    if (!CYCLES.has(cycle)) {
      return NextResponse.json({ message: "cycle invalide" }, { status: 400 });
    }

    const logo = typeof logoIn === "string" ? logoIn.trim() : "";
    if (!logo) {
      return NextResponse.json({ message: "logo is required (URL après upload)" }, { status: 400 });
    }

    let description: { title: string; contenu: string }[] = [];
    if (Array.isArray(descriptionIn) && descriptionIn.length) {
      description = descriptionIn;
    } else if (typeof descriptionText === "string" && descriptionText.trim()) {
      description = [{ title: "Description", contenu: descriptionText.trim() }];
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
      cycle,
      logo,
    });
    return NextResponse.json(
      { data: sectionWithoutSecrets(created.toObject() as unknown as Record<string, unknown>) },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create section", error: (error as Error).message },
      { status: 500 }
    );
  }
}
