import { NextResponse } from "next/server";
import { Types } from "mongoose";
import type { PipelineStage } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { AuthorizationModel } from "@/lib/models/User";
import { getSessionPayload, isAgentSession } from "@/lib/auth/sessionServer";

type AggregatedAuthorization = {
  _id: Types.ObjectId;
  designation: string;
  code: string;
  agentId: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
  agent?: {
    _id: Types.ObjectId;
    name: string;
    email: string;
    matricule: string;
    photo?: string;
    role?: string;
    status?: string;
  };
};

export async function GET(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!isAgentSession(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const { searchParams } = new URL(request.url);
    const agentId = (searchParams.get("agentId") ?? "").trim();
    const code = (searchParams.get("code") ?? "").trim();
    const codesRaw = (searchParams.get("codes") ?? "").trim();
    const search = (searchParams.get("search") ?? "").trim();
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 50;
    if (agentId && !Types.ObjectId.isValid(agentId)) {
      return NextResponse.json({ message: "Valid agentId is required" }, { status: 400 });
    }

    const codeFilters = codesRaw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    if (code) {
      codeFilters.push(code);
    }

    const match: Record<string, unknown> = {};
    if (agentId) {
      match.agentId = new Types.ObjectId(agentId);
    }
    if (codeFilters.length === 1) {
      match.code = codeFilters[0];
    } else if (codeFilters.length > 1) {
      match.code = { $in: [...new Set(codeFilters)] };
    }

    const pipeline: PipelineStage[] = [
      { $match: match },
      {
        $lookup: {
          from: "agents",
          localField: "agentId",
          foreignField: "_id",
          as: "agent",
        },
      },
      {
        $unwind: {
          path: "$agent",
          preserveNullAndEmptyArrays: false,
        },
      },
    ];

    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      pipeline.push({
        $match: {
          $or: [
            { "agent.name": { $regex: rx } },
            { "agent.email": { $regex: rx } },
            { "agent.matricule": { $regex: rx } },
          ],
        },
      });
    }

    pipeline.push({ $sort: { createdAt: -1 } });
    pipeline.push({
      $facet: {
        data: [{ $skip: safeOffset }, { $limit: safeLimit }],
        meta: [{ $count: "total" }],
      },
    });

    const [result] = await AuthorizationModel.aggregate<{
      data: AggregatedAuthorization[];
      meta: { total: number }[];
    }>(pipeline);
    const total = result?.meta?.[0]?.total ?? 0;
    const data = (result?.data ?? []).map((item) => ({
      _id: String(item._id),
      designation: item.designation,
      code: item.code,
      agentId: String(item.agentId),
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      agent: item.agent
        ? {
            _id: String(item.agent._id),
            name: item.agent.name,
            email: item.agent.email,
            matricule: item.agent.matricule,
            photo: item.agent.photo ?? "",
            role: item.agent.role ?? "",
            status: item.agent.status ?? "",
          }
        : null,
    }));

    return NextResponse.json(
      {
        data,
        pagination: { offset: safeOffset, limit: safeLimit, total },
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to fetch authorizations", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionPayload();
    if (!isAgentSession(session)) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const payload = await request.json();
    const { designation, code, agentId } = payload as {
      designation?: string;
      code?: string;
      agentId?: string;
    };

    if (!designation || !code || !agentId || !Types.ObjectId.isValid(agentId)) {
      return NextResponse.json(
        { message: "designation, code and valid agentId are required" },
        { status: 400 }
      );
    }

    const alreadyExists = await AuthorizationModel.findOne({ code, agentId });
    if (alreadyExists) {
      return NextResponse.json(
        { message: "Authorization already exists for this agent" },
        { status: 409 }
      );
    }

    const created = await AuthorizationModel.create({ designation, code, agentId });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to create authorization", error: (error as Error).message },
      { status: 500 }
    );
  }
}
