import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import { authManager } from "@/lib/services/AuthManager";

type StudentAuthBody =
    | {
          action: "requestOtp";
          email: string;
      }
    | {
          action: "verifyOtp";
          email: string;
          otp: string;
      };

export async function GET(request: Request) {
    try {
        await connectDB();

        const { searchParams } = new URL(request.url);
        const email = searchParams.get("email");

        if (email) {
            const student = await userManager.getUserByEmail("Student", email);
            if (!student) {
                return NextResponse.json({ message: "Student not found" }, { status: 404 });
            }

            return NextResponse.json({ data: student }, { status: 200 });
        }

        const students = await userManager.getAllStudents();
        return NextResponse.json({ data: students }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to fetch students", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const payload = await request.json();

        const student = await userManager.createStudent(payload);
        return NextResponse.json({ data: student }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to create student", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        await connectDB();
        const body = (await request.json()) as Partial<StudentAuthBody>;

        if (!body.action || !body.email) {
            return NextResponse.json(
                { message: "Invalid payload. Expected action and email." },
                { status: 400 }
            );
        }

        if (body.action === "requestOtp") {
            const otpData = await authManager.requestOtp("Student", body.email);
            return NextResponse.json(
                {
                    message: "OTP sent successfully",
                    email: otpData.email,
                    expiresInMs: otpData.expiresInMs,
                },
                { status: 200 }
            );
        }

        if (body.action === "verifyOtp") {
            if (!body.otp) {
                return NextResponse.json({ message: "OTP is required" }, { status: 400 });
            }

            const verified = await authManager.verifyOtpAndCreateSession(
                "Student",
                body.email,
                body.otp
            );
            const response = NextResponse.json(
                {
                    message: "Authentication successful",
                    data: verified.user,
                    token: verified.token,
                    expiresInMs: verified.expiresInMs,
                },
                { status: 200 }
            );

            response.cookies.set("auth_session", verified.token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
                path: "/",
                maxAge: Math.floor(verified.expiresInMs / 1000),
            });

            return response;
        }

        return NextResponse.json(
            { message: "Unknown action. Use requestOtp or verifyOtp." },
            { status: 400 }
        );
    } catch (error) {
        const code = (error as Error).message;
        if (code === "user_not_found") {
            return NextResponse.json({ message: "Student not found" }, { status: 404 });
        }
        if (code === "otp_not_found" || code === "otp_expired") {
            return NextResponse.json({ message: "OTP not found or expired" }, { status: 400 });
        }
        if (code === "otp_invalid") {
            return NextResponse.json({ message: "Invalid OTP" }, { status: 401 });
        }

        return NextResponse.json(
            { message: "Failed to authenticate student", error: (error as Error).message },
            { status: 500 }
        );
    }
}
