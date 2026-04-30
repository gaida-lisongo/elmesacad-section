"use client";

import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { PublicUniteCard } from "@/actions/publicUnites";

type Props = {
  unites: PublicUniteCard[];
};

export default function MarketplaceCoursesFinder({ unites }: Props) {
  const [query, setQuery] = useState("");
  const [creditsFilter, setCreditsFilter] = useState("");

  const filteredUnits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const creditValue = creditsFilter.trim();

    return unites.filter((item) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        item.designation.toLowerCase().includes(normalizedQuery) ||
        item.code.toLowerCase().includes(normalizedQuery);

      const matchesCredits =
        creditValue.length === 0 || item.credits === Number(creditValue);

      return matchesQuery && matchesCredits;
    });
  }, [creditsFilter, query, unites]);

  return (
    <section className="w-full border-y border-slate-200 bg-white dark:border-slate-700 dark:bg-darklight">
      <div className="grid min-h-[580px] lg:grid-cols-3">
        <div className="relative overflow-hidden lg:col-span-1">
          <img
            src="/images/inbtp/jpg/img-10.jpg"
            alt="Etudiante INBTP"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/75 to-primary/55" />

          <motion.div
            className="absolute -left-20 -top-20 h-56 w-56 rounded-full bg-primary/30 blur-3xl"
            animate={{ x: [0, 16, -12, 0], y: [0, 20, -10, 0], opacity: [0.4, 0.7, 0.5, 0.4] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-10 right-4 h-52 w-52 rounded-full bg-blue-300/25 blur-3xl"
            animate={{ x: [0, -16, 10, 0], y: [0, -20, 8, 0], opacity: [0.35, 0.65, 0.45, 0.35] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-20 left-10 h-32 w-32 rounded-full bg-cyan-200/20 blur-2xl"
            animate={{ scale: [1, 1.2, 0.95, 1], opacity: [0.3, 0.6, 0.35, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />

          <div className="relative z-10 flex h-full items-end p-6">
            <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">Trouver une unite</p>
              <h3 className="mt-2 text-2xl font-bold text-white">Moteur des unites d&apos;enseignement</h3>
              <p className="mt-2 text-sm text-white/90">
                Rechercher rapidement une unite par code, designation et credits.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="border-b border-slate-200 p-4 dark:border-slate-700 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Marketplace UE</p>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {filteredUnits.length} resultat(s)
                </p>
              </div>

              <div className="grid w-full gap-2 sm:w-auto sm:grid-cols-[minmax(260px,1fr)_120px]">
                <input
                  type="text"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Rechercher par designation ou code"
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <input
                  type="number"
                  min="0"
                  value={creditsFilter}
                  onChange={(event) => setCreditsFilter(event.target.value)}
                  placeholder="Credits"
                  className="h-10 rounded-lg border border-slate-300 px-3 text-sm outline-none transition focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          <div className="max-h-[580px] overflow-y-auto">
            <div className="grid grid-cols-[1fr_90px_110px_34px] items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300 sm:px-5">
              <span>Unite</span>
              <span className="text-right">Credits</span>
              <span className="text-right">Nombre cours</span>
              <span />
            </div>

            {filteredUnits.length > 0 ? (
              filteredUnits.map((item) => (
                <Link
                  key={item.id}
                  href={`/unite/${item.id}`}
                  className="grid grid-cols-[1fr_90px_110px_34px] items-center gap-2 border-b border-slate-200 px-4 py-3 transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-900/30 sm:px-5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-primary">{item.code}</p>
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.designation}</p>
                  </div>
                  <p className="text-right text-sm font-bold text-slate-900 dark:text-white">{item.credits}</p>
                  <p className="text-right text-sm font-semibold text-slate-700 dark:text-slate-200">{item.coursesCount}</p>
                  <Icon icon="mdi:chevron-right" className="justify-self-end text-xl text-slate-500 dark:text-slate-300" />
                </Link>
              ))
            ) : (
              <div className="p-6 text-center text-sm text-slate-600 dark:text-slate-300">
                Aucune unite ne correspond aux filtres.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
