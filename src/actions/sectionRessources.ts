"use server";

import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";

export async function readJsonPayload(upstream: Response, rawText: string): Promise<Record<string, unknown>> {
  if (!rawText) return {};
  try {
    return JSON.parse(rawText) as Record<string, unknown>;
  } catch {
    return { message: rawText.slice(0, 400) };
  }
}

export async function pickErrorMessage(payload: Record<string, unknown>, fallback: string): Promise<string> {
  return (
    (typeof payload.message === "string" && payload.message) ||
    (typeof payload.error === "string" && payload.error) ||
    fallback
  );
}

export async function getSectionRessourcesData(sectionCtx: {
    sectionId: string;
    sectionSlug: string;
    categorie: string;
    search?: string;
}) {
    const page = 1;
    const limit = 100000;

    const sp = new URLSearchParams({
        page: String(page),
        limit: String(limit),
        categorie: sectionCtx.categorie,
    });

    sp.append("branding.sectionRef", sectionCtx.sectionSlug);

    if (sectionCtx.search) {
        sp.append("search", sectionCtx.search);
    }

    const upstream = await fetchEtudiantApi(
        `/resources?${sp.toString()}`,
        {
            method: "GET",
        }
    );

    const rawText = await upstream.text();
    const payload = await readJsonPayload(upstream, rawText);

    if (!upstream.ok) {
        throw new Error(await pickErrorMessage(payload, "Impossible de charger les sessions d'enrôlement."));
    }
    
      const data = Array.isArray(payload.data) ? payload.data : [];
    
      const meta = payload.meta && typeof payload.meta === "object" ? (payload.meta as Record<string, unknown>) : {};
    
      const total = typeof meta.total === "number" ? meta.total : data.length;
    
      return {
    
        data,
    
        total,
    
        page: typeof meta.page === "number" ? meta.page : page,
    
        limit: typeof meta.limit === "number" ? meta.limit : limit,
    
      };
}