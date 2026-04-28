import { randomUUID } from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { resolveAuthSessionSecret } from "@/lib/auth/jwtSecret";
import { sendMail } from "@/lib/mail/Mail";
import userManager, { UserByEmailResult, UserType } from "@/lib/services/UserManager";

type OtpEntry = {
    otp: string;
    expiresAt: number;
};

export type SessionPayload = {
    sub: string;
    email: string;
    type: UserType;
    role?: string;
    name?: string;
};

type VerifyOtpSuccess = {
    token: string;
    user: UserByEmailResult;
    expiresInMs: number;
};

class AuthManager {
    private static instance: AuthManager;
    private readonly otpTtlMs = 5 * 60 * 1000;
    private readonly sessionTtlMs = 12 * 60 * 60 * 1000;
    private readonly otpStore = new Map<string, OtpEntry>();

    private constructor() {}

    public static getInstance(): AuthManager {
        if (!AuthManager.instance) {
            AuthManager.instance = new AuthManager();
        }
        return AuthManager.instance;
    }

    private normalizeEmail(email: string): string {
        return email.trim().toLowerCase();
    }

    private keyOf(type: UserType, email: string): string {
        return `${type}:${this.normalizeEmail(email)}`;
    }

    private getJwtSecret(): Uint8Array {
        return new TextEncoder().encode(resolveAuthSessionSecret());
    }

    private generateOtp(): string {
        return Math.floor(100000 + Math.random() * 900000)
            .toString()
            .slice(0, 6);
    }

    private buildSessionPayload(type: UserType, email: string, user: UserByEmailResult): SessionPayload {
        const generic = user as unknown as { _id?: { toString: () => string }; name?: string };
        const role = type === "Agent" ? (user as { role?: string }).role : undefined;

        return {
            sub: generic._id?.toString?.() ?? email,
            email,
            type,
            role,
            name: generic.name,
        };
    }

    public async createSessionToken(payload: SessionPayload): Promise<string> {
        return new SignJWT(payload)
            .setProtectedHeader({ alg: "HS256", typ: "JWT" })
            .setIssuedAt()
            .setJti(randomUUID())
            .setExpirationTime(Math.floor((Date.now() + this.sessionTtlMs) / 1000))
            .sign(this.getJwtSecret());
    }

    public async requestOtp(type: UserType, rawEmail: string) {
        const email = this.normalizeEmail(rawEmail);
        const user = await userManager.getUserByEmail(type, email);

        if (!user) {
            throw new Error("user_not_found");
        }

        const otp = this.generateOtp();
        const expiresAt = Date.now() + this.otpTtlMs;
        this.otpStore.set(this.keyOf(type, email), { otp, expiresAt });

        await sendMail({
            to: email,
            subject: "Votre code OTP",
            html: `
                <div style="font-family:Arial,sans-serif;background:#f6f7fb;padding:24px;">
                    <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px;">
                        <h2 style="margin:0 0 12px;color:#111827;">Code de verification</h2>
                        <p style="margin:0 0 12px;color:#374151;">
                            Utilisez ce code OTP pour vous authentifier.
                        </p>
                        <p style="font-size:30px;letter-spacing:6px;font-weight:700;margin:12px 0;color:#111827;">
                            ${otp}
                        </p>
                        <p style="margin:0;color:#6b7280;">
                            Ce code expire dans 5 minutes.
                        </p>
                    </div>
                </div>
            `,
        });

        return { email, expiresInMs: this.otpTtlMs };
    }

    public async verifyOtpAndCreateSession(
        type: UserType,
        rawEmail: string,
        otp: string
    ): Promise<VerifyOtpSuccess> {
        const email = this.normalizeEmail(rawEmail);
        const user = await userManager.getUserByEmail(type, email);

        if (!user) {
            throw new Error("user_not_found");
        }

        const entry = this.otpStore.get(this.keyOf(type, email));
        if (!entry) {
            throw new Error("otp_not_found");
        }

        if (Date.now() > entry.expiresAt) {
            this.otpStore.delete(this.keyOf(type, email));
            throw new Error("otp_expired");
        }

        if (entry.otp !== otp.trim()) {
            throw new Error("otp_invalid");
        }

        this.otpStore.delete(this.keyOf(type, email));
        const payload = this.buildSessionPayload(type, email, user);

        const token = await this.createSessionToken(payload);

        return {
            token,
            user,
            expiresInMs: this.sessionTtlMs,
        };
    }

    public async verifySession(token: string) {
        const verified = await jwtVerify(token, this.getJwtSecret());
        return verified.payload as SessionPayload;
    }
}

export const authManager = AuthManager.getInstance();
export { AuthManager };
