import { NextResponse } from "next/server";
import { connectDB } from "@/lib/services/connectedDB";
import { authManager } from "@/lib/services/AuthManager";

type UserType = "Agent" | "Student";
type AuthAction = "requestOtp" | "verifyOtp";

type RequestOtpBody = {
    action: "requestOtp";
    type: UserType;
    email: string;
};

type VerifyOtpBody = {
    action: "verifyOtp";
    type: UserType;
    email: string;
    otp: string;
};

type AuthRequestBody = RequestOtpBody | VerifyOtpBody;

const isValidAction = (value: unknown): value is AuthAction =>
    value === "requestOtp" || value === "verifyOtp";

const isValidType = (value: unknown): value is UserType =>
    value === "Agent" || value === "Student";

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = (await request.json()) as Partial<AuthRequestBody>;

        if (!isValidAction(body.action) || !isValidType(body.type) || !body.email) {
            return NextResponse.json(
                {
                    message:
                        "Invalid payload. Expected action, type ('Agent' | 'Student') and email.",
                },
                { status: 400 }
            );
        }

        if (body.action === "requestOtp") {
            const otpData = await authManager.requestOtp(body.type, body.email);

            return NextResponse.json(
                {
                    message: "OTP sent successfully",
                    email: otpData.email,
                    expiresInMs: otpData.expiresInMs,
                },
                { status: 200 }
            );
        }

        if (!("otp" in body) || typeof body.otp !== "string" || body.otp.trim().length === 0) {
            return NextResponse.json(
                { message: "OTP is required for verification" },
                { status: 400 }
            );
        }

        const verified = await authManager.verifyOtpAndCreateSession(body.type, body.email, body.otp);
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
    } catch (error) {
        const code = (error as Error).message;
        if (code === "user_not_found") {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }
        if (code === "otp_not_found" || code === "otp_expired") {
            return NextResponse.json({ message: "OTP not found or expired" }, { status: 400 });
        }
        if (code === "otp_invalid") {
            return NextResponse.json({ message: "Invalid OTP" }, { status: 401 });
        }

        return NextResponse.json(
            { message: "Authentication failed", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function GET(request: Request) {
    try {
        const token = request.headers.get("authorization")?.replace("Bearer ", "").trim();
        const cookieToken = request.headers
            .get("cookie")
            ?.split(";")
            .find((chunk) => chunk.trim().startsWith("auth_session="))
            ?.split("=")[1];

        const sessionToken = token || cookieToken;
        if (!sessionToken) {
            return NextResponse.json({ message: "Session token missing" }, { status: 401 });
        }

        const session = await authManager.verifySession(sessionToken);
        return NextResponse.json({ data: session }, { status: 200 });
    } catch (error) {
        return NextResponse.json(
            { message: "Invalid session", error: (error as Error).message },
            { status: 401 }
        );
    }
}
