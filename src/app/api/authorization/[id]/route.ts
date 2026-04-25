import { NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { AuthorizationModel } from "@/lib/models/User";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  try {
    await connectDB();
    const { id } = await context.params;

    if (!Types.ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid authorization id" }, { status: 400 });
    }

    const deleted = await AuthorizationModel.findByIdAndDelete(id);
    if (!deleted) {
      return NextResponse.json({ message: "Authorization not found" }, { status: 404 });
    }

    return NextResponse.json({ data: deleted }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Failed to delete authorization", error: (error as Error).message },
      { status: 500 }
    );
  }
}
