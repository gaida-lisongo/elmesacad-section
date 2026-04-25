import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { SectionModel } from "@/lib/models/Section";
import { getSessionPayload, isAgentSession, canEditSensitiveFields } from "@/lib/auth/sessionServer";
import { sectionWithoutSecrets } from "@/lib/utils/sectionResponse";
import { Types } from "mongoose";
import { STUDENT_CYCLES } from "@/lib/constants/studentCycles";

const CYCLES = new Set<string>([...STUDENT_CYCLES]);

const bureauPopulate = [
  { path: "bureau.chefSection", select: "name email" },
  { path: "bureau.chargeEnseignement", select: "name email" },
  { path: "bureau.chargeRecherche", select: "name email" },
];

type Ctx = { params: Promise<{ slug: string }> };

function leanWithStringId(d: Record<string, unknown>) {
  const o = { ...d };
  if (o._id) o._id = String(o._id);
  if (o.bureau && typeof o.bureau === "object" && o.bureau !== null) {
    const b = o.bureau as Record<string, unknown>;
    for (const k of ["chefSection", "chargeEnseignement", "chargeRecherche"] as const) {
      const v = b[k];
      if (v && typeof v === "object" && v !== null && "_id" in (v as object)) {
        b[k] = { ...(v as object), _id: String((v as { _id: unknown })._id) };
      }
    }
  }
  return o;
}

export async function GET(_: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ message: "Slug manquant" }, { status: 400 });
  }

  try {
    await connectDB();
    const doc = await SectionModel.findOne({ slug: slug.trim() })
      .populate(bureauPopulate)
      .lean()
      .exec();

    if (!doc) {
      return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
    }

    const base = leanWithStringId({ ...(doc as Record<string, unknown>) });
    const canEditKeys = canEditSensitiveFields(session);
    if (!canEditKeys) {
      return NextResponse.json({
        data: { ...sectionWithoutSecrets(base as Record<string, unknown>), canEditKeys: false },
      });
    }
    if (base._id) base._id = String(base._id);
    if (base.secretKey) base.secretKey = String(base.secretKey);
    if (base.apiKey) base.apiKey = String(base.apiKey);
    return NextResponse.json({ data: { ...base, canEditKeys: true } });
  } catch (error) {
    return NextResponse.json(
      { message: "Échec chargement", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request, context: Ctx) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!isAgentSession(session)) {
    return NextResponse.json({ message: "Réservé aux agents" }, { status: 403 });
  }

  const { slug } = await context.params;
  if (!slug?.trim()) {
    return NextResponse.json({ message: "Slug manquant" }, { status: 400 });
  }

  const payload = (await request.json()) as {
    designation?: string;
    email?: string;
    website?: string;
    telephone?: string;
    description?: { title: string; contenu: string }[];
    descriptionText?: string;
    cycle?: string;
    bureau?: {
      chefSection?: string;
      chargeEnseignement?: string;
      chargeRecherche?: string;
    };
  };

  const update: Record<string, unknown> = {};
  if (payload.designation !== undefined) update.designation = payload.designation;
  if (payload.email !== undefined) update.email = payload.email;
  if (payload.website !== undefined) update.website = payload.website;
  if (payload.telephone !== undefined) update.telephone = payload.telephone;
  if (payload.cycle !== undefined) {
    const c = String(payload.cycle).trim();
    if (!CYCLES.has(c)) {
      return NextResponse.json({ message: "cycle invalide" }, { status: 400 });
    }
    update.cycle = c;
  }
  if (payload.description !== undefined) {
    update.description = payload.description;
  } else if (payload.descriptionText !== undefined) {
    const t = String(payload.descriptionText).trim();
    update.description = t ? [{ title: "Description", contenu: t }] : [];
  }

  try {
    await connectDB();

    if (payload.bureau !== undefined) {
      const cur = await SectionModel.findOne({ slug: slug.trim() }).lean();
      if (!cur) {
        return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
      }
      const prev = (cur.bureau as Record<string, unknown> | undefined) ?? {};
      const next: Record<string, Types.ObjectId> = {};
      for (const key of ["chefSection", "chargeEnseignement", "chargeRecherche"] as const) {
        if (!payload.bureau || !Object.prototype.hasOwnProperty.call(payload.bureau, key)) {
          const ex = prev[key];
          if (ex && Types.ObjectId.isValid(String(ex))) {
            next[key] = new Types.ObjectId(String(ex));
          }
          continue;
        }
        const v = payload.bureau[key];
        if (v === "" || v == null) {
          continue;
        }
        if (!Types.ObjectId.isValid(String(v))) {
          return NextResponse.json({ message: `ID bureau invalide : ${key}` }, { status: 400 });
        }
        next[key] = new Types.ObjectId(String(v));
      }
      update.bureau = next;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ message: "Aucun champ à mettre à jour" }, { status: 400 });
    }

    const doc = await SectionModel.findOneAndUpdate(
      { slug: slug.trim() },
      { $set: update },
      { new: true, runValidators: true }
    )
      .populate(bureauPopulate)
      .lean();

    if (!doc) {
      return NextResponse.json({ message: "Section introuvable" }, { status: 404 });
    }
    const base = leanWithStringId(doc as unknown as Record<string, unknown>);
    const canEditKeys = canEditSensitiveFields(session);
    if (!canEditKeys) {
      return NextResponse.json({
        data: { ...sectionWithoutSecrets(base as Record<string, unknown>), canEditKeys: false },
      });
    }
    if (base.secretKey) base.secretKey = String(base.secretKey);
    if (base.apiKey) base.apiKey = String(base.apiKey);
    if (base._id) base._id = String(base._id);
    return NextResponse.json({ data: { ...base, canEditKeys: true } });
  } catch (error) {
    return NextResponse.json(
      { message: "Mise à jour impossible", error: (error as Error).message },
      { status: 500 }
    );
  }
}
