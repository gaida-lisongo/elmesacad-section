"use server";

import { listSujetCommandesForResourceAction } from "@/actions/organisateurSujetResources";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";

/**
 * Contextes métier pour lister les commandes liées à une ressource du service étudiant.
 * Étendre ici (ex. `stage`, `fiche-validation`) puis brancher vers l’action serveur appropriée.
 */
export type EtudiantResourceCommandeContext = "sujet-recherche";

export type ListEtudiantResourceCommandesResult = {
  rows: SujetCommandeListRow[];
  total: number;
  page: number;
  limit: number;
};

export async function listEtudiantResourceCommandesAction(input: {
  context: EtudiantResourceCommandeContext;
  sectionSlug: string;
  resourceId: string;
  page?: number;
  limit?: number;
}): Promise<ListEtudiantResourceCommandesResult> {
  const { context, sectionSlug, resourceId, page, limit } = input;

  if (context === "sujet-recherche") {
    return listSujetCommandesForResourceAction({
      sectionSlug,
      resourceId,
      page,
      limit,
    });
  }

  throw new Error(`Contexte commandes non supporté : ${String(context)}`);
}
