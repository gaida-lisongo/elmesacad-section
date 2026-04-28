"use client";

import { Icon } from "@iconify/react";

export function StatusSwitch({
  active,
  disabled,
  onToggle,
  busy,
}: {
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      aria-label={active ? "Désactiver" : "Activer"}
      disabled={disabled}
      onClick={onToggle}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-all duration-300 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900 ${
        active
          ? "bg-gradient-to-r from-primary to-secondary shadow-sm shadow-primary/20"
          : "bg-gray-200 dark:bg-gray-600"
      } ${disabled ? "pointer-events-none cursor-not-allowed opacity-60" : "hover:scale-105 active:scale-95"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-[9px] font-bold shadow-md transition-transform duration-300 ease-out ${
          active ? "translate-x-5" : "translate-x-0"
        }`}
        aria-hidden
      >
        {busy ? (
          <Icon icon="svg-spinners:ring-resize" className="size-3.5 text-sky-600" />
        ) : active ? (
          "✓"
        ) : null}
      </span>
    </button>
  );
}
