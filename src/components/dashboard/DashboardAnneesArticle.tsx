"use client";

import type { DashboardAnneesMode, DashboardRole, DashboardWhiteListItem } from "@/lib/dashboard/types";
import { formatAnneeTitle } from "@/lib/dashboard/formatAnneeTitle";
import { AdminAnneeBlock } from "@/components/dashboard/AdminAnneeBlock";

export function DashboardAnneesArticle({
  anneesMode,
  role,
  whiteList,
  currentAnneeId,
  onCurrentAnneeChange,
}: {
  anneesMode: DashboardAnneesMode;
  role: DashboardRole;
  whiteList: DashboardWhiteListItem[];
  currentAnneeId?: string;
  onCurrentAnneeChange?: (anneeId: string) => void;
}) {
  if (anneesMode === "hidden") return null;

  return (
    <article
      className="animate-dashboard-in rounded-xl border border-gray-200/80 bg-gradient-to-b from-white to-primary/5 p-4 shadow-sm transition duration-500 hover:shadow-md dark:border-gray-800 dark:from-gray-900 dark:to-primary/10 dark:hover:shadow-primary/10 lg:col-span-2"
      style={{ animationDelay: "260ms" }}
    >
      {anneesMode === "crud" ? (
        <AdminAnneeBlock
          items={whiteList}
          canCreate={role === "admin"}
          canToggleStatus={role === "admin"}
          canDelete={role === "admin"}
        />
      ) : (
        <div>
          <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Années académiques</h2>
          {whiteList.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">Aucune année publiée.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {whiteList.slice(0, 12).map((w, wi) => (
                <li
                  key={w.slug}
                  className="flex animate-dashboard-in items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-sm transition hover:border-primary/30 dark:border-gray-800 dark:bg-gray-800/50"
                  style={{ animationDelay: `${wi * 40}ms` }}
                >
                  <button
                    type="button"
                    onClick={() => w.id && onCurrentAnneeChange?.(w.id)}
                    disabled={!w.id || !onCurrentAnneeChange}
                    className={`font-medium text-midnight_text dark:text-white ${
                      currentAnneeId && w.id === currentAnneeId
                        ? "underline decoration-primary decoration-2 underline-offset-4"
                        : ""
                    }`}
                  >
                    {formatAnneeTitle(w.debut, w.fin)}
                  </button>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                      w.status
                        ? "bg-primary/15 text-primary dark:text-primary"
                        : "bg-gray-200/80 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {w.status ? "actif" : "inactif"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  );
}
