import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Types } from "mongoose";
import { connectDB } from "@/lib/services/connectedDB";
import { UniteEnseignementModel } from "@/lib/models/UniteEnseignement";

export const metadata: Metadata = {
  title: "Detail unite | INBTP Marketplace",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UniteDetailPage({ params }: Props) {
  const { id } = await params;
  const normalizedId = String(id ?? "").trim();

  if (!Types.ObjectId.isValid(normalizedId)) notFound();

  await connectDB();
  const unit = await UniteEnseignementModel.findById(normalizedId)
    .select("designation code credits matieres description")
    .lean();

  if (!unit) notFound();

  const coursesCount = Array.isArray(unit.matieres) ? unit.matieres.length : 0;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-darklight">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">{String(unit.code ?? "").trim()}</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
          {String(unit.designation ?? "Unite")}
        </h1>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Credits</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{Number(unit.credits ?? 0)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-300">Nombre de cours</p>
            <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{coursesCount}</p>
          </div>
        </div>
      </div>
    </main>
  );
}
