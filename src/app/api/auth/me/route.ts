import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { authManager } from "@/lib/services/AuthManager";
import userManager from "@/lib/services/UserManager";
import { connectDB } from "@/lib/services/connectedDB";
import { mapDbUserToAuthUser } from "@/lib/auth/mapToAuthUser";

const COOKIE = "auth_session";

export async function GET() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  /** Pas de cookie = visiteur non connecté (inscription, avant OTP) — pas une erreur HTTP. */
  if (!token) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const payload = await authManager.verifySession(token);
    await connectDB();
    const user = await userManager.getUserByEmail(payload.type, payload.email);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: mapDbUserToAuthUser(user, payload.type) });
  } catch(error) {
    console.error("An error occurred while verifying session: ", (error as Error).message);
    return NextResponse.json(
      { message: "Invalid session", error: (error as Error).message },
      { status: 401 }
    );
  }
}
