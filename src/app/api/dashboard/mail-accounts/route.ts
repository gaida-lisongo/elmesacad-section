import { NextResponse } from "next/server";
import { canEditSensitiveFields, getSessionPayload } from "@/lib/auth/sessionServer";
import * as accountClient from "@/lib/mail-accounts/client";
import {
  MAIL_ACCOUNT_PASSWORD_MAX_LENGTH,
  MAIL_ACCOUNT_PASSWORD_MIN_LENGTH,
} from "@/lib/mail-accounts/payloads";

/**
 * Crée ou réinitialise un compte mail : le mot de passe est fourni par l’opérateur (tableau de bord).
 */
export async function POST(request: Request) {
  const session = await getSessionPayload();
  if (!session) {
    return NextResponse.json({ message: "Non authentifié" }, { status: 401 });
  }
  if (!canEditSensitiveFields(session)) {
    return NextResponse.json({ message: "Réservé aux administrateurs" }, { status: 403 });
  }

  let body: { email?: string; action?: "create" | "reset"; password?: string };
  try {
    body = (await request.json()) as { email?: string; action?: "create" | "reset"; password?: string };
  } catch {
    return NextResponse.json({ message: "JSON invalide" }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .trim()
    .toLowerCase();
  const action = body.action ?? "create";
  if (!email || !email.includes("@")) {
    return NextResponse.json({ message: "E-mail invalide" }, { status: 400 });
  }

  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < MAIL_ACCOUNT_PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { message: `Mot de passe : minimum ${MAIL_ACCOUNT_PASSWORD_MIN_LENGTH} caractères.` },
      { status: 400 }
    );
  }
  if (password.length > MAIL_ACCOUNT_PASSWORD_MAX_LENGTH) {
    return NextResponse.json(
      { message: `Mot de passe : maximum ${MAIL_ACCOUNT_PASSWORD_MAX_LENGTH} caractères.` },
      { status: 400 }
    );
  }
  if (password === email) {
    return NextResponse.json(
      { message: "Le mot de passe ne doit pas être identique à l’adresse e-mail." },
      { status: 400 }
    );
  }

  try {
    if (action === "reset") {
      const r = await accountClient.updateMailAccount(email, password);
      if (!r.ok) {
        return NextResponse.json({ message: r.message }, { status: r.status || 500 });
      }
      return NextResponse.json({ ok: true, updated: r.data.updated });
    }
    const exists = await accountClient.mailAccountExists(email);
    if (exists.ok && exists.data.exists) {
      return NextResponse.json({ message: "Un compte existe déjà pour cet e-mail" }, { status: 409 });
    }
    const r = await accountClient.createMailAccount(email, password);
    if (!r.ok) {
      return NextResponse.json({ message: r.message }, { status: r.status || 500 });
    }
    return NextResponse.json({ ok: true, status: r.data.status });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
