"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import { motion } from "framer-motion";
import type { PublicMetrics } from "@/actions/publicMetrics";

export default function MarketplaceMetricsPanel({ metrics }: { metrics: PublicMetrics }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.35, ease: "easeOut" }}
      className="mx-auto -mt-8 w-full px-4 md:-mt-10"
    >
      <div className="w-full rounded-3xl px-4 py-4 md:px-6 md:py-6">
        <div className="grid grid-cols-2 place-items-stretch gap-3 md:grid-cols-4 md:gap-4">
          {[
            { key: "filieres", label: "Filieres", value: metrics.filieres, icon: "mdi:domain" },
            { key: "unites", label: "Unites", value: metrics.unites, icon: "mdi:school-outline" },
            { key: "matieres", label: "Matieres", value: metrics.matieres, icon: "mdi:book-open-page-variant-outline" },
            { key: "sections", label: "Sections", value: metrics.sections, icon: "mdi:view-grid-outline" },
          ].map((item) => (
            <motion.article
              key={item.key}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="metrics-item-fade rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 px-4 py-5 text-slate-900 shadow-lg dark:border-slate-700 dark:from-darkmode dark:to-darklight"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10">
                  <Icon icon={item.icon} className="text-xl text-primary" />
                </span>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-700 dark:text-slate-200">
                  {item.label}
                </p>
              </div>
              <p className="mt-3 text-center text-3xl font-extrabold tabular-nums text-primary md:text-4xl">{item.value}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
