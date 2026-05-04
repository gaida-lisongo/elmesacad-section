"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import MenuSection from "./MenuSection";
import LogoutSection from "./LogoutSection";
import type { UserFloatingConfig } from "./types";
import { Icon } from "@iconify/react";

type UserFloatingMenuProps = {
  config: UserFloatingConfig;
  onLogout: () => void;
};

/**
 * Dock-style Menu: Horizontal bar with Theme Switcher, User Menu, and Logout access.
 */
export default function UserFloatingMenu({ config, onLogout }: UserFloatingMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenus, setOpenSubMenus] = useState<Record<string, boolean>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!mounted) return null;

  return (
    <div ref={containerRef} className="relative flex flex-col items-end">
      {/* Menu Panel */}
      {isOpen && (
        <div className="absolute bottom-full right-0 mb-4 flex max-h-[26rem] w-72 max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-primary/20 bg-white/90 p-0 shadow-2xl backdrop-blur-md dark:border-primary/30 dark:bg-gray-900/95 sm:w-80">
          <div className="max-h-80 overflow-y-auto px-4 pt-4">
            <div className="mb-4 flex items-center gap-3 border-b border-primary/10 pb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon icon="solar:user-bold" className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Compte</p>
                <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">
                  {config.account}
                </p>
              </div>
            </div>
            <MenuSection
              adminMenu={config.menu}
              openSubMenus={openSubMenus}
              onToggleSubMenu={toggleSubMenu}
              onNavigate={() => setIsOpen(false)}
            />
          </div>
          <div className="bg-primary/5 p-3 dark:bg-primary/10">
            <LogoutSection
              onLogout={() => {
                onLogout();
                setIsOpen(false);
              }}
            />
          </div>
        </div>
      )}

      {/* Dock Bar */}
      <div className="flex items-center gap-2 rounded-full border border-primary/20 bg-white/80 p-1.5 shadow-lg backdrop-blur-lg dark:border-white/10 dark:bg-gray-900/80">
        {/* Theme Toggler */}
        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition hover:bg-primary/10 hover:text-primary dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Icon icon="solar:sun-bold-duotone" className="h-6 w-6" />
          ) : (
            <Icon icon="solar:moon-bold-duotone" className="h-6 w-6" />
          )}
        </button>

        <div className="h-6 w-px bg-primary/20 dark:bg-white/10" />

        {/* User Menu Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`flex h-10 items-center gap-2 rounded-full px-4 transition ${
            isOpen
              ? "bg-primary text-white shadow-inner"
              : "text-gray-700 hover:bg-primary/10 hover:text-primary dark:text-gray-300 dark:hover:bg-white/10 dark:hover:text-white"
          }`}
        >
          <Icon icon="solar:menu-dots-bold-duotone" className="h-5 w-5" />
          <span className="max-w-[8rem] truncate text-xs font-bold uppercase tracking-wide">
            {config.account}
          </span>
        </button>
      </div>
    </div>
  );
}

export type { AdminMenuItem, UserFloatingConfig } from "./types";
