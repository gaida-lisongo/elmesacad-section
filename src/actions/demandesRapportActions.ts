"use server";

import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { listEtudiantResourceCommandesAction } from "@/actions/etudiantResourceCommandes";
import type { EtudiantResourceCommandeContext } from "@/actions/etudiantResourceCommandes";
import type { SujetCommandeListRow } from "@/actions/organisateurSujetResources";

type RapportPeriod = "daily" | "monthly" | "semester" | "annual";

type RapportRow = {
  ressourceDesignation: string;
  matricule: string;
  studentEmail: string;
  payment: string;
  reference: string;
  orderNumber: string;
  date: string;
};

export type RapportResult = {
  period: RapportPeriod;
  sectionDesignation: string;
  typeLabel: string;
  generatedAt: string;
  totalCommandes: number;
  totalPaid: number;
  totalPending: number;
  rows: RapportRow[];
};

function getDateRange(period: RapportPeriod): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);

  switch (period) {
    case "daily":
      start.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "semester":
      const month = now.getMonth();
      if (month < 6) {
        start.setMonth(0, 1);
      } else {
        start.setMonth(6, 1);
      }
      start.setHours(0, 0, 0, 0);
      break;
    case "annual":
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      break;
  }
  return { start, end };
}

const RESOURCE_CONTEXT_MAP: Record<string, EtudiantResourceCommandeContext> = {
  session: "session-gestionnaire",
  validation: "validation-gestionnaire",
  releve: "releve-gestionnaire",
  labo: "labo-gestionnaire",
};

export async function generateDemandesRapportAction(input: {
  type: "session" | "validation" | "releve" | "labo";
  period: RapportPeriod;
  resourceIds: string[];
  sectionSlug: string;
  typeLabel: string;
}): Promise<RapportResult> {
  const session = await getSessionPayload();
  if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
    throw new Error("Accès refusé. Réservé aux gestionnaires.");
  }

  const scope = await resolveGestionnaireScope(session.sub);
  if (!scope || scope.sectionSlug !== input.sectionSlug) {
    throw new Error("Section incohérente avec votre section d'attache.");
  }

  const context = RESOURCE_CONTEXT_MAP[input.type];
  if (!context) throw new Error("Type de ressource non supporté.");

  const { start, end } = getDateRange(input.period);
  const startStr = start.toISOString();
  const endStr = end.toISOString();

  let allRows: RapportRow[] = [];
  let totalPaid = 0;
  let totalPending = 0;

  for (const resourceId of input.resourceIds) {
    try {
      const commandes = await listEtudiantResourceCommandesAction({
        context,
        sectionSlug: input.sectionSlug,
        resourceId,
        page: 1,
        limit: 1000,
      });

      let designation = resourceId;
      if (commandes.rows.length > 0) {
        designation = commandes.rows[0].designation || designation;
      }

      for (const cmd of commandes.rows) {
        const cmdDate = cmd.createdAt ? new Date(cmd.createdAt) : null;
        if (cmdDate && (cmdDate < start || cmdDate > end)) continue;

        const isPaid =
          cmd.payment?.toLowerCase() === "success" ||
          cmd.payment?.toLowerCase() === "paid" ||
          cmd.payment?.toLowerCase() === "completed";

        if (isPaid) totalPaid++;
        else totalPending++;

        allRows.push({
          ressourceDesignation: designation,
          matricule: cmd.matricule,
          studentEmail: cmd.studentEmail,
          payment: cmd.payment,
          reference: cmd.reference,
          orderNumber: cmd.orderNumber,
          date: cmd.createdAt,
        });
      }
    } catch {
      // skip resource on error
    }
  }

  return {
    period: input.period,
    sectionDesignation: scope.sectionDesignation,
    typeLabel: input.typeLabel,
    generatedAt: new Date().toISOString(),
    totalCommandes: allRows.length,
    totalPaid,
    totalPending,
    rows: allRows,
  };
}