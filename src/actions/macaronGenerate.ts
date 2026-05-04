"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import type { DocumentMacaronPayload } from "@/lib/paiement/sessionEnrollementContext";

const MACARON_GENERATE_PATH = "/macaron/generate";

export type GenerateMacaronPdfResult =
  | { ok: true; filename: string; pdfBase64: string }
  | { ok: false; message: string; status?: number; details?: unknown };

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename\s*=\s*([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim().replace(/^"+|"+$/g, "");
  return null;
}

function stemFromPayload(payload: DocumentMacaronPayload): string {
  const fromEtudiant =
    payload.etudiant && typeof (payload.etudiant as { name?: unknown }).name === "string"
      ? String((payload.etudiant as { name: string }).name).trim()
      : "";
  const name = payload.promotion?.studentName?.trim() || fromEtudiant || "macaron-session";
  return name
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

export async function generateMacaronPdfAction(payload: DocumentMacaronPayload): Promise<GenerateMacaronPdfResult> {
  let res: Response;
  try {
    res = await fetchEtudiantApi(MACARON_GENERATE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/pdf, application/json;q=0.9",
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Réseau indisponible.";
    return { ok: false, message };
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (res.ok && contentType.includes("application/pdf")) {
    const buf = Buffer.from(await res.arrayBuffer());
    const fromHeader = parseFilenameFromContentDisposition(res.headers.get("content-disposition"));
    const safeStem = stemFromPayload(payload);
    let filename = fromHeader?.trim() || "";
    if (!filename.toLowerCase().endsWith(".pdf")) {
      const stem = filename.replace(/\.pdf$/i, "") || safeStem || "macaron-session";
      filename = `${stem}.pdf`;
    }
    return { ok: true, filename, pdfBase64: buf.toString("base64") };
  }

  let message = `Erreur service (${res.status})`;
  let details: unknown;
  if (contentType.includes("application/json")) {
    try {
      const j = (await res.json()) as Record<string, unknown>;
      message = String(j.error ?? j.message ?? message);
      details = j.details ?? j;
    } catch {
      /* ignore */
    }
  } else {
    try {
      const t = await res.text();
      if (t) message = t.slice(0, 500);
    } catch {
      /* ignore */
    }
  }

  return { ok: false, message, status: res.status, details };
}
