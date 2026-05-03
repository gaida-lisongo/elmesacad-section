"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import type { DocumentBulletinPayload } from "@/lib/paiement/documentBulletinPayload";

/** Chemin relatif côté service étudiant (Express : `POST /api/bulletin/generate`). */
const BULLETIN_GENERATE_PATH = "/bulletin/generate";

export type GenerateBulletinPdfResult =
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

/**
 * Demande la génération d’un PDF bulletin au service étudiant (`/api/bulletin/generate`).
 * Le binaire est renvoyé en base64 pour passage depuis une Server Action vers le client.
 */
export async function generateBulletinPdfAction(
  payload: DocumentBulletinPayload
): Promise<GenerateBulletinPdfResult> {
  
  let res: Response;
  try {
    res = await fetchEtudiantApi(BULLETIN_GENERATE_PATH, {
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
    const safeStem = (payload.student?.nom ?? "bulletin")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 80);
    let filename = fromHeader?.trim() || "";
    if (!filename.toLowerCase().endsWith(".pdf")) {
      const stem = filename.replace(/\.pdf$/i, "") || safeStem || "bulletin";
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
