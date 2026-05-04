"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import type { OrderSujetAdminFields, OrderSujetStudentPayload } from "@/lib/sujet/orderSujetTypes";

function isRecord(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function pickString(v: unknown): string {
  return String(v ?? "").trim();
}

function pickStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x ?? "").trim()).filter(Boolean);
}

function pickSections(v: unknown): { title: string; contenu: string[] }[] {
  if (!Array.isArray(v)) return [];
  const out: { title: string; contenu: string[] }[] = [];
  for (const row of v) {
    if (!isRecord(row)) continue;
    const title = pickString(row.title);
    const contenu = pickStringArray(row.contenu);
    if (contenu.length === 0) continue;
    out.push({ title: title || "Section", contenu });
  }
  return out;
}

/** Corps métier « sujet » tel que renvoyé par GET /commandes/:id (formes variables). */
function extractSujetDocument(cmd: Record<string, unknown>): Record<string, unknown> | null {
  const nested = [cmd.sujet, cmd.orderSujet, cmd.document, cmd.data].filter(isRecord);
  for (const n of nested) {
    if (pickString(n.titre) || pickString(n.directeur)) return n;
  }
  if (pickString(cmd.titre) || pickString(cmd.directeur)) return cmd;
  return null;
}

function unwrapResponse(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.data)) return raw.data as Record<string, unknown>;
  return raw;
}

export type GetEtudiantSujetCommandeResult =
  | {
      ok: true;
      payload: OrderSujetStudentPayload;
      admin: OrderSujetAdminFields;
      raw: Record<string, unknown>;
    }
  | { ok: false; message: string; status?: number };

export async function getEtudiantSujetCommandeAction(orderId: string): Promise<GetEtudiantSujetCommandeResult> {
  const id = String(orderId ?? "").trim();
  if (!id) return { ok: false, message: "Identifiant de commande service étudiant manquant." };

  console.log("[sujet][getEtudiantSujetCommandeAction] GET /commandes/:id", { id });

  let res: Response;
  try {
    res = await fetchEtudiantApi(`/commandes/${encodeURIComponent(id)}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Réseau indisponible." };
  }

  let parsed: unknown;
  try {
    parsed = await res.json();
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const msg =
      isRecord(parsed) && (pickString(parsed.message) || pickString(parsed.error))
        ? pickString(parsed.message) || pickString(parsed.error)
        : `Erreur service (${res.status})`;
    return { ok: false, message: msg, status: res.status };
  }

  const root = unwrapResponse(parsed);
  if (!root) return { ok: false, message: "Réponse service vide ou invalide." };

  const doc = extractSujetDocument(root) ?? root;
  const titre = pickString(doc.titre) || pickString(root.titre);
  const directeur = pickString(doc.directeur) || pickString(root.directeur);
  const co_directeur = pickString(doc.co_directeur) || pickString(root.co_directeur);
  const thematique = pickString(doc.thematique) || pickString(root.thematique);

  const payload: OrderSujetStudentPayload = {
    titre,
    directeur,
    co_directeur,
    thematique,
    justification: pickStringArray(doc.justification),
    problematique: pickStringArray(doc.problematique),
    objectif: pickStringArray(doc.objectif),
    methodologie: pickSections(doc.methodologie),
    resultats_attendus: pickSections(doc.resultats_attendus),
    chronogrammes: pickSections(doc.chronogrammes),
    references: pickSections(doc.references),
  };

  const noteRaw = doc.note ?? root.note;
  let note: number | null = null;
  if (typeof noteRaw === "number" && Number.isFinite(noteRaw)) note = noteRaw;
  else if (noteRaw != null && noteRaw !== "") {
    const n = Number(noteRaw);
    if (Number.isFinite(n)) note = n;
  }

  const valRaw = doc.validation ?? root.validation;
  const validation =
    typeof valRaw === "boolean" ? valRaw : valRaw === "true" ? true : valRaw === "false" ? false : null;

  const admin: OrderSujetAdminFields = {
    note,
    validation,
    observations: doc.observations ?? root.observations ?? null,
  };

  console.log("[sujet][getEtudiantSujetCommandeAction] OK", {
    titre: payload.titre?.slice(0, 60),
    note: admin.note,
    validation: admin.validation,
  });

  return { ok: true, payload, admin, raw: root };
}

export type PatchEtudiantSujetCommandeResult = { ok: true } | { ok: false; message: string; status?: number };

export async function patchEtudiantSujetCommandeAction(
  orderId: string,
  body: OrderSujetStudentPayload
): Promise<PatchEtudiantSujetCommandeResult> {
  const id = String(orderId ?? "").trim();
  if (!id) return { ok: false, message: "Identifiant de commande service étudiant manquant." };

  let res: Response;
  try {
    res = await fetchEtudiantApi(`/commandes/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Réseau indisponible." };
  }

  if (res.ok) return { ok: true };

  let message = `Erreur service (${res.status})`;
  try {
    const j = (await res.json()) as Record<string, unknown>;
    if (isRecord(j)) message = pickString(j.message) || pickString(j.error) || message;
  } catch {
    /* ignore */
  }
  return { ok: false, message, status: res.status };
}
