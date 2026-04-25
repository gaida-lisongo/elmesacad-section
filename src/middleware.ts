import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = "auth_session";

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(COOKIE)?.value;
  if (!token) {
    return NextResponse.redirect(
      new URL(
        `/signin?from=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`,
        request.url
      )
    );
  }

  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 16) {
    return NextResponse.redirect(new URL("/signin?error=auth_config", request.url));
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return NextResponse.next();
  } catch {
    const res = NextResponse.redirect(
      new URL(
        `/signin?from=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`,
        request.url
      )
    );
    res.cookies.set(COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  }
}

export const config = {
  matcher: [
    "/profile",
    "/profile/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/agents",
    "/agents/:path*",
    "/etudiants",
    "/etudiants/:path*",
    "/sections",
    "/sections/:path*",
    "/tickets",
    "/tickets/:path*",
  ],
};
