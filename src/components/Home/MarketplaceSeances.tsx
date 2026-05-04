"use client";

import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { PublicSeanceCard } from "@/actions/publicSeances";
import { formatShortDate } from "@/utils/formatDate";

export default function MarketplaceSeances({ seances }: { seances: PublicSeanceCard[] }) {
  return (
    <section className="px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">Seances recentes</p>
          <h3 className="mt-2 text-2xl font-bold text-midnight_text dark:text-white md:text-3xl">
            Dernieres seances publiees
          </h3>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Consulte rapidement les 6 seances les plus recentes et accede a la page de consultation.
          </p>
        </div>

        {seances.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {seances.map((seance) => (
              <article
                key={seance.id}
                className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-700 dark:bg-darklight"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src="/images/inbtp/jpg/img-126.jpg"
                    alt="Illustration seance INBTP"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/50 to-slate-900/10" />
                  <img
                    src="/images/inbtp/png/img-2.png"
                    alt="Logo institut INBTP"
                    className="absolute bottom-3 left-3 h-12 w-12 rounded-lg bg-white/90 p-1 object-contain shadow-md"
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-[#dc2626] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm">
                    Seance
                  </span>
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <h4 className="line-clamp-2 text-base font-bold text-slate-900 dark:text-white">
                      {seance.title}
                    </h4>
                    <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500 dark:text-slate-300">
                      {seance.matiere} · {seance.promotion}
                    </p>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                    <p className="flex items-center gap-2">
                      <Icon icon="mdi:calendar-blank-outline" className="text-base text-primary" />
                      {formatShortDate(seance.dateSeance)}
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon icon="mdi:clock-time-four-outline" className="text-base text-primary" />
                      {seance.jour || "Jour non precise"} · {seance.heureDebut || "--:--"} -{" "}
                      {seance.heureFin || "--:--"}
                    </p>
                    <p className="flex items-center gap-2">
                      <Icon icon="mdi:map-marker-outline" className="text-base text-primary" />
                      {seance.salle}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/presence?seanceRef=${encodeURIComponent(seance.id)}`}
                      className="inline-flex flex-1 items-center justify-center rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                    >
                      Presences
                    </Link>
                    <Link
                      href={`/charge_horaire/${encodeURIComponent(seance.chargeId)}`}
                      className="inline-flex flex-2 items-center justify-center rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-darkprimary"
                    >
                      Detail du cours
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-darklight dark:text-slate-300">
            Aucune seance recente disponible pour le moment.
          </div>
        )}
      </div>
    </section>
  );
}
