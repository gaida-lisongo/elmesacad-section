import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import { authManager } from "@/lib/services/AuthManager";
import type { Agent } from "@/lib/models/User";

type AgentAuthBody =
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
        const role = searchParams.get("role") as Agent["role"] | null;
        const search = searchParams.get("search") ?? "";
        const offset = Number(searchParams.get("offset") ?? "0");
        const limit = Number(searchParams.get("limit") ?? "50");
        const safeOffset = Number.isFinite(offset) && offset >= 0 ? offset : 0;
        const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 50) : 50;

        if (email) {
            const agent = await userManager.getUserByEmail("Agent", email);
            if (!agent) {
                return NextResponse.json({ message: "Agent not found" }, { status: 404 });
            }

            return NextResponse.json({ data: agent }, { status: 200 });
        }

        const agents = await userManager.getAgentsPaginated({
            role: role ?? undefined,
            search,
            offset: safeOffset,
            limit: safeLimit,
        });

        return NextResponse.json(
            {
                data: agents,
                pagination: {
                    offset: safeOffset,
                    limit: safeLimit,
                },
                filters: {
                    role: role ?? "all",
                    search,
                },
            },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to fetch agents", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        await connectDB();
        const body = await request.json();
        const payload = {
            ...body,
            status: "inactive",
            sexe: body.sexe ?? "M",
            dateDeNaissance: body.dateDeNaissance ?? new Date("2000-01-01"),
            nationalite: body.nationalite ?? "A definir",
            lieuDeNaissance: body.lieuDeNaissance ?? "A definir",
            adresse: body.adresse ?? "A definir",
            telephone: body.telephone ?? "000000000",
            photo: body.photo ?? "/images/user.jpg",
            ville: body.ville ?? "A definir",
            withdrawals: body.withdrawals ?? [],
        };

        const agent = await userManager.createAgent(payload);
        return NextResponse.json({ data: agent }, { status: 201 });
    } catch (error) {
        return NextResponse.json(
            { message: "Failed to create agent", error: (error as Error).message },
            { status: 500 }
        );
    }
}

export async function PATCH(request: Request) {
    try {
        await connectDB();
        const body = (await request.json()) as Partial<AgentAuthBody>;
        console.log("PATCH body", body);
        if (!body.action || !body.email) {
            return NextResponse.json(
                { message: "Invalid payload. Expected action and email." },
                { status: 400 }
            );
        }

        if (body.action === "requestOtp") {
            const otpData = await authManager.requestOtp("Agent", body.email);
            console.log("PATCH otpData", otpData);
            return NextResponse.json(
                {
                    message: "OTP sent successfully",
                    email: otpData.email,
                    expiresInMs: otpData.expiresInMs,
                },
                { status: 200 }
            );
        }
        console.log("PATCH body.action", body.action);

        if (body.action === "verifyOtp") {
            if (!body.otp) {
                return NextResponse.json({ message: "OTP is required" }, { status: 400 });
            }

            const verified = await authManager.verifyOtpAndCreateSession("Agent", body.email, body.otp);
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
        console.error("An error occurred while authenticating agent: ", (error as Error).message);
        const code = (error as Error).message;
        if (code === "user_not_found") {
            return NextResponse.json({ message: "Agent not found" }, { status: 404 });
        }
        if (code === "otp_not_found" || code === "otp_expired") {
            return NextResponse.json({ message: "OTP not found or expired" }, { status: 400 });
        }
        if (code === "otp_invalid") {
            return NextResponse.json({ message: "Invalid OTP" }, { status: 401 });
        }

        return NextResponse.json(
            { message: "Failed to authenticate agent", error: (error as Error).message },
            { status: 500 }
        );
    }
}
