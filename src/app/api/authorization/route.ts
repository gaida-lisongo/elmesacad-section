import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { AuthorizationModel } from "@/lib/models/User";

export async function GET(request: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId");
    const offset = Number(searchParams.get("offset") ?? "0");
    const limit = Number(searchParams.get("limit") ?? "50");
    const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 50;

    if (!agentId || !Types.ObjectId.isValid(agentId)) {
      return NextResponse.json({ message: "Valid agentId is required" }, { status: 400 });
    }

    const data = await AuthorizationModel.find({ agentId })
      .sort({ createdAt: -1 })
      .skip(safeOffset)
      .limit(safeLimit);

    return NextResponse.json(
      {
        data,
        pagination: { offset: safeOffset, limit: safeLimit },
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
