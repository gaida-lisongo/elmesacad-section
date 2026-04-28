"use client";

import type { DashboardTableRow } from "@/lib/dashboard/types";

export function ReadonlyUserTable({ rows, headers }: { rows: DashboardTableRow[]; headers: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-gray-200 dark:border-gray-700">
            {headers.map((header) => (
              <th
                key={header}
                className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={headers.length}
                className="px-3 py-6 text-center text-gray-500"
              >
                Aucune donnée pour l’instant
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-gray-100 transition-colors hover:bg-gray-50/80 dark:border-gray-800 dark:hover:bg-gray-800/40"
              >
                {row.columns.map((col, idx) => (
                  <td
                    key={`${row.id}-c${idx}`}
                    className="px-3 py-2 text-gray-700 dark:text-gray-200"
                  >
                    {col}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
