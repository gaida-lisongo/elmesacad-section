"use server";

import { listSujetCommandesForResourceAction } from "@/actions/organisateurSujetResources";
import { listStageCommandesForResourceAction } from "@/actions/organisateurStageResources";
import { listValidationCommandesForResourceAction } from "@/actions/gestionnaireValidationResources";
import { listReleveCommandesForResourceAction } from "@/actions/gestionnaireReleveResources";
import { listSessionCommandesForResourceAction } from "@/actions/gestionnaireSessionResources";
import { listLaboCommandesForResourceAction } from "@/actions/gestionnaireLaboResources";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";

/**
 * Contextes métier pour lister les commandes liées à une ressource du service étudiant.
 * Étendre ici (ex. `fiche-validation`) puis brancher vers l’action serveur appropriée.
 */
export type EtudiantResourceCommandeContext =
  | "sujet-recherche"
  | "stage-enseignement"
  | "validation-gestionnaire"
  | "releve-gestionnaire"
  | "session-gestionnaire"
  | "labo-gestionnaire";

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

  if (context === "stage-enseignement") {
    return listStageCommandesForResourceAction({
      sectionSlug,
      resourceId,
      page,
      limit,
    });
  }

  if (context === "validation-gestionnaire") {
    return listValidationCommandesForResourceAction({
      sectionSlug,
      resourceId,
      page,
      limit,
    });
  }

  if (context === "releve-gestionnaire") {
    return listReleveCommandesForResourceAction({
      sectionSlug,
      resourceId,
      page,
      limit,
    });
  }

  if (context === "session-gestionnaire") {
    return listSessionCommandesForResourceAction({
      sectionSlug,
      resourceId,
      page,
      limit,
    });
  }

  if (context === "labo-gestionnaire") {
    return listLaboCommandesForResourceAction({
      sectionSlug,
      resourceId,
      page,
      limit,
    });
  }

  throw new Error(`Contexte commandes non supporté : ${String(context)}`);
}
