import { AgentModel, StudentModel } from "@/lib/models/User";
import { SectionModel } from "@/lib/models/Section";
import { AnneeModel } from "@/lib/models/Annee";
import { RechargeModel } from "@/lib/models/Recharge";
import { connectDB } from "@/lib/services/connectedDB";
import { loadDashboardUsersSampleTable } from "@/lib/services/dashboardUsersSampleTable";
import type {
  DashboardChartSeries,
  DashboardMetric,
  DashboardTableData,
  DashboardWhiteListItem,
} from "@/lib/dashboard/types";

const MONTHS_FR = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

function ratioProgress(active: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((active / total) * 100));
}

export async function loadAdminDashboardData(): Promise<{
  metrics: DashboardMetric[];
  whiteList: DashboardWhiteListItem[];
  chartData: DashboardChartSeries[];
  tableData: DashboardTableData;
  chartYear: number;
}> {
  await connectDB();

  const [
    agentsTotal,
    agentsActive,
    studentsTotal,
    studentsActive,
    sectionsTotal,
    sectionsActive,
  ] = await Promise.all([
    AgentModel.countDocuments(),
    AgentModel.countDocuments({ status: "active" }),
    StudentModel.countDocuments(),
    StudentModel.countDocuments({ status: "active" }),
    SectionModel.countDocuments(),
    SectionModel.countDocuments({
      website: { $regex: /^\s*\S/ },
    }),
  ]);

  const metrics: DashboardMetric[] = [
    {
      title: "Agents",
      value: `${agentsActive} / ${agentsTotal}`,
      progress: ratioProgress(agentsActive, agentsTotal),
    },
    {
      title: "Étudiants",
      value: `${studentsActive} / ${studentsTotal}`,
      progress: ratioProgress(studentsActive, studentsTotal),
    },
    {
      title: "Sections (site web publié)",
      value: `${sectionsActive} / ${sectionsTotal}`,
      progress: ratioProgress(sectionsActive, sectionsTotal),
    },
  ];

  const annees = await AnneeModel.find().sort({ debut: -1 }).lean().exec();
  const whiteList: DashboardWhiteListItem[] = annees.map((a) => {
    const d = a as {
      _id: unknown;
      designation?: string;
      slug: string;
      status: boolean;
      debut: number;
      fin: number;
    };
    const des =
      d.designation != null && String(d.designation).trim() !== "" ? String(d.designation).trim() : "";
    return {
      id: String(d._id),
      debut: d.debut,
      fin: d.fin,
      designation: des,
      slug: d.slug,
      status: Boolean(d.status),
    };
  });

  const now = new Date();
  const chartYear = now.getFullYear();
  const yStart = new Date(chartYear, 0, 1);
  const yEnd = new Date(chartYear, 11, 31, 23, 59, 59, 999);

  const byMonthAndStatus = await RechargeModel.aggregate<{
    _id: { m: number; s: "pending" | "paid" | "failed" };
    c: number;
  }>([
    { $match: { createdAt: { $gte: yStart, $lte: yEnd } } },
    { $group: { _id: { m: { $month: "$createdAt" }, s: "$status" }, c: { $sum: 1 } } },
  ]).exec();

  const byMonth: Map<
    number,
    { pending: number; paid: number; failed: number }
  > = new Map();
  for (let m = 1; m <= 12; m++) {
    byMonth.set(m, { pending: 0, paid: 0, failed: 0 });
  }
  for (const row of byMonthAndStatus) {
    const m = row._id.m;
    const s = row._id.s;
    const cur = byMonth.get(m);
    if (!cur) continue;
    if (s === "pending") cur.pending = row.c;
    else if (s === "paid") cur.paid = row.c;
    else if (s === "failed") cur.failed = row.c;
  }

  /** Ordre des segments (du bas vers le haut) : en attente → payé → échoué */
  const chartData: DashboardChartSeries[] = [
    {
      variable: "En attente",
      data: MONTHS_FR.map((month, i) => {
        const v = byMonth.get(i + 1);
        return { month, value: v?.pending ?? 0 };
      }),
    },
    {
      variable: "Payé",
      data: MONTHS_FR.map((month, i) => {
        const v = byMonth.get(i + 1);
        return { month, value: v?.paid ?? 0 };
      }),
    },
    {
      variable: "Échoué",
      data: MONTHS_FR.map((month, i) => {
        const v = byMonth.get(i + 1);
        return { month, value: v?.failed ?? 0 };
      }),
    },
  ];

  const limit = 10;
  const tableData: DashboardTableData = await loadDashboardUsersSampleTable(limit);

  return { metrics, whiteList, chartData, tableData, chartYear };
}
