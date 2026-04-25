'use client';

import { useEffect, useRef, useState } from "react";
import MenuSection from "./MenuSection";
import LogoutSection from "./LogoutSection";
import UserInfoSection from "./UserInfoSection";
import { AdminMenuItem } from "./types";

type UserFloatingMenuProps = {
  matricule: string;
  userName?: string;
  userEmail?: string;
  adminMenu: AdminMenuItem[];
};

export default function UserFloatingMenu({
  matricule,
  userName = "Utilisateur actif",
  userEmail = "email@exemple.com",
  adminMenu,
}: UserFloatingMenuProps) {
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
        <div className="absolute bottom-full right-0 mb-3 flex h-[26rem] w-80 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-gray-700 dark:bg-gray-900">
          <UserInfoSection userName={userName} userEmail={userEmail} matricule={matricule} />
          <MenuSection
            adminMenu={adminMenu}
            openSubMenus={openSubMenus}
            onToggleSubMenu={toggleSubMenu}
            onNavigate={() => setIsOpen(false)}
          />
          <LogoutSection
            onLogout={() => {
              console.log("Deconnexion");
              setIsOpen(false);
            }}
          />
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="rounded-full bg-[#082b1c] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white shadow-md transition hover:bg-darkmode"
        aria-label="Afficher le menu utilisateur"
      >
        {matricule}
      </button>
    </div>
  );
}

export type { AdminMenuItem };
