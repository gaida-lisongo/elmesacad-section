import { NextResponse } from "next/server";
import { getTitulaireServiceBase } from "@/lib/service-auth/upstreamFetch";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";
import { gradeQcmResolution } from "@/lib/qcm/gradeResolution";

type ResolutionPayload = {
  email: string;
  matricule: string;
  matiere: string;
  note: number;
  activite_id: string;
  reponses_qcm: Array<{ qcm_id: string; reponse: string }>;
  reponses_tp: Array<{ tp_id: string; reponse: string; fichiers: string[] }>;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export async function POST(request: Request) {
  const input = (await request.json().catch(() => ({}))) as Partial<ResolutionPayload>;
  const payload: ResolutionPayload = {
    email: String(input.email ?? "").trim(),
    matricule: String(input.matricule ?? "").trim(),
    matiere: String(input.matiere ?? "").trim(),
    note: Number(input.note ?? 0),
    activite_id: normalizeMongoObjectIdString(String(input.activite_id ?? "").trim()) ?? "",
    reponses_qcm: Array.isArray(input.reponses_qcm) ? input.reponses_qcm : [],
    reponses_tp: Array.isArray(input.reponses_tp) ? input.reponses_tp : [],
  };

  if (!payload.email || !payload.matricule || !payload.activite_id) {
    return NextResponse.json(
      { success: false, message: "email, matricule et activite_id sont requis." },
      { status: 400 }
    );
  }

  const base = getTitulaireServiceBase();
  if (!base) {
    return NextResponse.json({ success: false, message: "TITULAIRE_SERVICE non configuré." }, { status: 500 });
  }

  // QCM only: auto-correction before submission.
  if (payload.reponses_qcm.length > 0) {
    const activiteRes = await fetch(`${base}/activites/${encodeURIComponent(payload.activite_id)}`, {
      method: "GET",
      cache: "no-store",
    });
    const activiteBody = await activiteRes.json().catch(() => ({} as Record<string, unknown>));
    if (activiteRes.ok) {
      const root = isObject(activiteBody) ? activiteBody : {};
      const data = (isObject(root.data) ? root.data : root) as Record<string, unknown>;
      const noteMax = Number(data.note_maximale ?? 0);
      const questions = Array.isArray(data.qcm) ? data.qcm : [];
      const grading = gradeQcmResolution({
        noteMaximale: noteMax,
        questions: questions as Array<{ reponse?: string }>,
        answers: payload.reponses_qcm,
      });
      payload.note = grading.note;
    }
  }

  const upstream = await fetch(`${base}/resolutions/submit`, {
    method: "POST",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const msg = isObject(body) ? String(body.message ?? body.error ?? "Soumission refusée.") : "Soumission refusée.";
    return NextResponse.json({ success: false, message: msg }, { status: upstream.status });
  }
  return NextResponse.json(body, { status: upstream.status });
}
