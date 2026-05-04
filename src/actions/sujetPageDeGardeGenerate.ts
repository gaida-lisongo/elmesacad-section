"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";

const PAGE_GARDE_PATH = "/couverture/generate";

export type GenerateSujetPageDeGardeResult =
  | { ok: true; filename: string; pdfBase64: string }
  | { ok: false; message: string; status?: number; details?: unknown };

export type GenerateSujetPageDeGardeInput = {
  id: string;
  titre: string;
  directeur: string;
  co_directeur: string;
  anneeAcad: string;
  cycle: string;
};

function parseFilenameFromContentDisposition(header: string | null): string | null {
  if (!header) return null;
  const quoted = /filename\s*=\s*"([^"]+)"/i.exec(header);
  if (quoted?.[1]) return quoted[1].trim();
  const plain = /filename\s*=\s*([^;\s]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim().replace(/^"+|"+$/g, "");
  return null;
}

export async function generateSujetPageDeGardeAction(
  input: GenerateSujetPageDeGardeInput
): Promise<GenerateSujetPageDeGardeResult> {
  const { id, titre, directeur, co_directeur, anneeAcad, cycle } = input;

  if (!id) return { ok: false, message: "Identifiant de commande manquant." };

  console.log("[sujet][pageDeGarde] POST", PAGE_GARDE_PATH, { orderId: id, titre });

  let res: Response;
  try {
    res = await fetchEtudiantApi(PAGE_GARDE_PATH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/pdf, application/json;q=0.9",
      },
      body: JSON.stringify({ id, titre, directeur, co_directeur, anneeAcad, cycle }),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Réseau indisponible.";
    return { ok: false, message };
  }

  const contentType = res.headers.get("content-type") ?? "";

  if (res.ok && contentType.includes("application/pdf")) {
    const buf = Buffer.from(await res.arrayBuffer());
    const fromHeader = parseFilenameFromContentDisposition(res.headers.get("content-disposition"));
    let filename = fromHeader?.trim() || "";
    if (!filename.toLowerCase().endsWith(".pdf")) {
      filename = `page-de-garde-sujet-${id.slice(0, 12)}.pdf`;
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
