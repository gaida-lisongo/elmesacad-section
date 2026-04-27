import { NextResponse } from "next/server";
import userManager from "@/lib/services/UserManager";
import { requireAdminTransactionsAccess } from "@/lib/dashboard/requireAdminTransactionsAccess";
import {
  exportFilenameSlug,
  getRechargeExportRange,
  isRechargeExportPeriod,
  parseExportReferenceDate,
  type RechargeExportPeriod,
} from "@/lib/recharges/exportPeriodRange";
import { buildRechargesExportWorkbook } from "@/lib/recharges/buildRechargesExportWorkbook";

/**
 * Export Excel (Synthèse + Données sources) pour les recharges sur une période.
 * Query : `period` = daily | monthly | semester | annual, `date` = YYYY-MM-DD (jour de référence, UTC).
 */
export async function GET(request: Request) {
  const denied = await requireAdminTransactionsAccess();
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const periodRaw = searchParams.get("period") ?? "daily";
  const dateRaw = searchParams.get("date") ?? "";

  if (!isRechargeExportPeriod(periodRaw)) {
    return NextResponse.json(
      { message: "Paramètre period invalide (daily, monthly, semester, annual)." },
      { status: 400 }
    );
  }
  const period = periodRaw as RechargeExportPeriod;

  const ref = parseExportReferenceDate(dateRaw);
  if (!ref) {
    return NextResponse.json(
      { message: "Paramètre date requis (YYYY-MM-DD), jour de référence pour la période." },
      { status: 400 }
    );
  }

  const { start, end, labelFr, periodTypeFr } = getRechargeExportRange(period, ref);

  try {
    const items = await userManager.getRechargesInDateRange({ start, end });
    const generatedAt = new Date();
    const buffer = await buildRechargesExportWorkbook({
      items,
      periodTypeFr,
      rangeLabelFr: labelFr,
      generatedAt,
    });

    const filename = exportFilenameSlug(period, dateRaw);
    const asciiName = filename.replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${asciiName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return NextResponse.json({ message: (e as Error).message }, { status: 500 });
  }
}
