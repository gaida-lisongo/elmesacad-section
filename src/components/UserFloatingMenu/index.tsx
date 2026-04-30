"use client";

import { useEffect, useRef, useState } from "react";
import MenuSection from "./MenuSection";
import LogoutSection from "./LogoutSection";
import type { UserFloatingConfig } from "./types";

type UserFloatingMenuProps = {
  config: UserFloatingConfig;
  onLogout: () => void;
};

/**
 * Flottant : le bouton affiche uniquement le type de compte ; le panneau liste `config.menu` (dynamique) + déconnexion.
 */
export default function UserFloatingMenu({ config, onLogout }: UserFloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const toggleSubMenu = (key: string) => {
    setOpenSubMenus((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div ref={containerRef} className="relative flex items-end">
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-3 flex max-h-[26rem] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-primary/20 bg-white p-0 shadow-xl dark:border-primary/30 dark:bg-gray-900 sm:w-80">
          <div className="max-h-80 overflow-y-auto px-2 pt-2">
            <MenuSection
              adminMenu={config.menu}
              openSubMenus={openSubMenus}
              onToggleSubMenu={toggleSubMenu}
              onNavigate={() => setIsOpen(false)}
            />
          </div>
          <div className="border-t border-primary/20 p-2 dark:border-primary/30">
            <LogoutSection
              onLogout={() => {
                onLogout();
                setIsOpen(false);
              }}
            />
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="max-w-[min(12rem,70vw)] rounded-full border border-primary/30 bg-primary px-4 py-2.5 text-center text-xs font-bold uppercase tracking-wide text-white shadow-md transition hover:bg-darkprimary"
        aria-label="Menu compte"
      >
        <span className="block truncate leading-tight">{config.account}</span>
      </button>
    </div>
  );
}

export type { AdminMenuItem, UserFloatingConfig } from "./types";
