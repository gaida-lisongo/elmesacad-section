import { NextResponse } from "next/server";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";
import { connectDB } from "@/lib/services/connectedDB";
import { CommandeModel } from "@/lib/models/Commande";
import { getGestionnaireSessionResourceAction } from "@/actions/gestionnaireSessionResources";
import {
  buildSessionOrdersExportWorkbook,
  filterOrdersByPeriod,
  type SessionExportPeriod,
} from "@/lib/commandes/buildSessionOrdersExportWorkbook";
import { SESSION_PERIOD_OPTIONS } from "@/lib/commandes/buildSessionOrdersExportWorkbook";

/**
 * Export Excel des commandes d'une session d'examen.
 *
 * Query params :
 *   resourceId  (obligatoire) — ID de la session
 *   period      (défaut: daily) — daily | weekly | monthly | semester | annual | custom
 *   date        (défaut: aujourd'hui) — jour de référence YYYY-MM-DD (ignoré si custom)
 *   start       (requis si custom) — date début YYYY-MM-DD
 *   end         (requis si custom) — date fin YYYY-MM-DD
 */
export async function GET(request: Request) {
  try {
    // ── Auth ─────────────────────────────────────────────────────
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent" || session.role !== "organisateur") {
      return NextResponse.json({ message: "Accès réservé aux organisateurs." }, { status: 403 });
    }

    await connectDB();
    const scope = await resolveGestionnaireScope(session.sub);
    if (!scope?.sectionSlug) {
      return NextResponse.json({ message: "Aucune section trouvée." }, { status: 403 });
    }

    // ── Paramètres ───────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get("resourceId");
    if (!resourceId) {
      return NextResponse.json({ message: "Paramètre resourceId requis." }, { status: 400 });
    }

    const periodRaw = searchParams.get("period") ?? "daily";
    const dateRaw = searchParams.get("date") ?? "";
    const startRaw = searchParams.get("start") ?? "";
    const endRaw = searchParams.get("end") ?? "";

    const validPeriods: SessionExportPeriod[] = ["daily", "weekly", "monthly", "semester", "annual", "custom"];
    const period = validPeriods.includes(periodRaw as SessionExportPeriod)
      ? (periodRaw as SessionExportPeriod)
      : "daily";

    // ── Désignation ──────────────────────────────────────────────
    let designation = resourceId;
    try {
      const detail = await getGestionnaireSessionResourceAction({
        sectionSlug: scope.sectionSlug,
        id: resourceId,
      });
      designation = detail.designation || resourceId;
    } catch {
      // fallback
    }

    // ── Données ──────────────────────────────────────────────────
    const commandes = await CommandeModel.find({
      "ressource.categorie": "SESSION",
      "ressource.reference": resourceId,
    }).lean();

    const orders = commandes.map((c: any) => ({
      _id: c._id.toString(),
      student: {
        nom: c?.ressource?.metadata?.fullName ?? "N/A",
        matricule: c?.student?.matricule ?? "N/A",
        email: c?.student?.email ?? "N/A",
      },
      transaction: {
        _id: c?.transaction?.providerResponses?._id?.$_oid ?? "N/A",
        categorie: c?.ressource?.categorie ?? "N/A",
        orderNumber: c?.transaction?.orderNumber ?? "N/A",
        amount: c?.transaction?.amount ?? 0,
        currency: c?.transaction?.currency ?? "N/A",
        phoneNumber: c?.transaction?.phoneNumber ?? "N/A",
        providerInfo: c?.transaction?.providerResponses?.lastCheck?.message ?? "N/A",
      },
      status: c.status,
      createdAt: c.createdAt,
      rechargeId: c.rechargeId,
    }));

    // ── Filtrage par période ─────────────────────────────────────
    const now = new Date();
    let customStart: Date | undefined;
    let customEnd: Date | undefined;

    if (period === "custom") {
      if (!startRaw || !endRaw) {
        return NextResponse.json(
          { message: "Paramètres start et end requis (YYYY-MM-DD) pour period=custom." },
          { status: 400 }
        );
      }
      customStart = new Date(startRaw + "T00:00:00.000Z");
      customEnd = new Date(endRaw + "T00:00:00.000Z");
      if (isNaN(customStart.getTime()) || isNaN(customEnd.getTime())) {
        return NextResponse.json({ message: "Dates invalides (format YYYY-MM-DD)." }, { status: 400 });
      }
    }

    const filtered = filterOrdersByPeriod(orders, period, now, customStart, customEnd);

    // ── Libellé de période ───────────────────────────────────────
    const periodOption = SESSION_PERIOD_OPTIONS.find((o) => o.value === period);
    let periodLabel = periodOption?.label ?? period;

    if (period === "custom" && customStart && customEnd) {
      periodLabel = `${customStart.toLocaleDateString("fr-FR")} → ${customEnd.toLocaleDateString("fr-FR")}`;
    } else {
      periodLabel += ` — ${now.toLocaleDateString("fr-FR")}`;
    }

    // ── Génération du classeur ───────────────────────────────────
    const generatedAt = new Date();
    const buffer = await buildSessionOrdersExportWorkbook({
      orders: filtered,
      designation,
      resourceId,
      period,
      periodLabel,
      generatedAt,
    });

    // ── Réponse ──────────────────────────────────────────────────
    const safeId = resourceId.replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `commandes-session-${period}-${safeId}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Session orders export error:", err);
    return NextResponse.json(
      { message: "Erreur lors de la génération du rapport." },
      { status: 500 }
    );
  }
}