import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(_: Request, context: RouteContext) {
    try {
        await connectDB();
        const { id } = await context.params;

        const agent = await userManager.getAgentById(id);
        if (!agent) {
            return NextResponse.json({ message: "Agent not found" }, { status: 404 });
        }

        return NextResponse.json({ data: agent }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to fetch agent", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        await connectDB();
        const { id } = await context.params;
        const payload = await request.json();

        const agent = await userManager.updateAgent(id, payload);
        if (!agent) {
            return NextResponse.json({ message: "Agent not found" }, { status: 404 });
        }

        return NextResponse.json({ data: agent }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to update agent", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function DELETE(_: Request, context: RouteContext) {
    try {
        await connectDB();
        const { id } = await context.params;

        const agent = await userManager.deleteAgent(id);
        if (!agent) {
            return NextResponse.json({ message: "Agent not found" }, { status: 404 });
        }

        return NextResponse.json({ data: agent }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to delete agent", error: (error as Error).message },
            { status: 500 }
        );
    }
}
