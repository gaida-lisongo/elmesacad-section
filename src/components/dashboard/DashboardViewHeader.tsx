"use client";

import type { DashboardUiConfig } from "@/lib/dashboard/types";

export function DashboardViewHeader({
  title,
  userName,
  infoMessage,
  ui,
}: {
  title: string;
  userName?: string;
  infoMessage?: string;
  ui: DashboardUiConfig;
}) {
  return (
    <header className="animate-dashboard-in">
      <h1 className="text-2xl font-bold tracking-tight text-midnight_text dark:text-white md:text-3xl">
        {title}
      </h1>
      {userName && (
        <p className="mt-1 text-sm text-gray-600 transition dark:text-gray-400">Bonjour, {userName}</p>
      )}
      {ui.subtitle && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{ui.subtitle}</p>
      )}
      {infoMessage && (
        <p className="mt-2 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-900 transition-all duration-300 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100">
          {infoMessage}
        </p>
      )}
    </header>
  );
}
