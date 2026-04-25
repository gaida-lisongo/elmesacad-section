'use client';

import Link from "next/link";
import { AdminMenuItem } from "./types";

type MenuSectionProps = {
  adminMenu: AdminMenuItem[];
  openSubMenus: Record<string, boolean>;
  onToggleSubMenu: (key: string) => void;
  onNavigate: () => void;
};

export default function MenuSection({
  adminMenu,
  openSubMenus,
  onToggleSubMenu,
  onNavigate,
}: MenuSectionProps) {
  return (
    <div className="border-b border-gray-200 py-3 dark:border-gray-700">
      <nav className="max-h-64 space-y-2 overflow-y-auto pr-1">
        {adminMenu.map((entry) => {
          const entryKey = `${entry.item}-${entry.path}`;

          return (
            <div key={entryKey}>
              {entry.subMenu && entry.subMenu.length > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={() => onToggleSubMenu(entryKey)}
                    className="flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  >
                    <span>{entry.item}</span>
                    <span
                      className={`transition-transform duration-200 ${
                        openSubMenus[entryKey] ? "rotate-180" : "rotate-0"
                      }`}
                    >
                      ▼
                    </span>
                  </button>

                  {openSubMenus[entryKey] && (
                    <div className="ml-3 mt-1 space-y-1 border-l border-gray-200 pl-2 dark:border-gray-700">
                      {entry.subMenu.map((sub) => (
                        <Link
                          key={`${sub.item}-${sub.path}`}
                          href={sub.path}
                          className="block rounded px-2 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                          onClick={onNavigate}
                        >
                          {sub.item}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={entry.path}
                  className="block rounded px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
                  onClick={onNavigate}
                >
                  {entry.item}
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </div>
  );
}
