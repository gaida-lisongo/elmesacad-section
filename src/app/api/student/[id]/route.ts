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

        const student = await userManager.getStudentById(id);
        if (!student) {
            return NextResponse.json({ message: "Student not found" }, { status: 404 });
        }

        return NextResponse.json({ data: student }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to fetch student", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function PUT(request: Request, context: RouteContext) {
    try {
        await connectDB();
        const { id } = await context.params;
        const payload = await request.json();

        const student = await userManager.updateStudent(id, payload);
        if (!student) {
            return NextResponse.json({ message: "Student not found" }, { status: 404 });
        }

        return NextResponse.json({ data: student }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to update student", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function DELETE(_: Request, context: RouteContext) {
    try {
        await connectDB();
        const { id } = await context.params;

        const student = await userManager.deleteStudent(id);
        if (!student) {
            return NextResponse.json({ message: "Student not found" }, { status: 404 });
        }

        return NextResponse.json({ data: student }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to delete student", error: (error as Error).message },
            { status: 500 }
        );
    }
}
