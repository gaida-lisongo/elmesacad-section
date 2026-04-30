"use server";

import { connectDB } from "@/lib/services/connectedDB";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";

export type PublicUniteCard = {
  id: string;
  designation: string;
  code: string;
  credits: number;
  coursesCount: number;
};

type UniteRaw = {
  _id: unknown;
  designation?: string;
  code?: string;
  credits?: number;
  matieres?: unknown[];
};

export async function listPublicUnites(limit = 8): Promise<PublicUniteCard[]> {
  try {
    await connectDB();
    const safeLimit = Math.min(Math.max(1, limit), 50);

    const rows = (await UniteEnseignementModel.find({})
      .sort({ createdAt: -1 })
      .select("designation code credits matieres")
      .limit(safeLimit)
      .lean()
      .exec()) as UniteRaw[];

    return rows.map((row) => ({
      id: String(row._id ?? ""),
      designation: row.designation?.trim() || "Unite sans designation",
      code: row.code?.trim() || "Code indisponible",
      credits: Number(row.credits ?? 0),
      coursesCount: Array.isArray(row.matieres) ? row.matieres.length : 0,
    }));
  } catch {
    return [];
  }
}
