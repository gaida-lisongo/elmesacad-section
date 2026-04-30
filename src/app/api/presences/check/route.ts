import { NextResponse } from "next/server";
import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";

type CheckPayload = {
  matricule: string;
  email: string;
  seanceRef: string;
  latitude: number;
  longitude: number;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<CheckPayload>;
  const payload: CheckPayload = {
    matricule: String(body.matricule ?? "").trim(),
    email: String(body.email ?? "").trim(),
    seanceRef: String(body.seanceRef ?? "").trim(),
    latitude: Number(body.latitude ?? NaN),
    longitude: Number(body.longitude ?? NaN),
  };

  if (!payload.matricule || !payload.email || !payload.seanceRef) {
    return NextResponse.json({ success: false, message: "matricule, email et seanceRef sont requis." }, { status: 400 });
  }
  if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
    return NextResponse.json({ success: false, message: "Coordonnées GPS invalides." }, { status: 400 });
  }

  const base = getTitulaireServiceBase();
  if (!base) {
    return NextResponse.json({ success: false, message: "TITULAIRE_SERVICE non configuré." }, { status: 500 });
  }

  const upstream = await fetch(`${base}/presences/check`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

