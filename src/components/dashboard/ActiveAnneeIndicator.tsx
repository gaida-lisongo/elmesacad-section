"use client";

type ActiveAnneeIndicatorProps = {
  label: string;
  className?: string;
};

/**
 * Indicateur visuel simple de l'année de contexte section.
 */
export function ActiveAnneeIndicator({ label, className = "" }: ActiveAnneeIndicatorProps) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-200 ${className}`.trim()}
    >
      <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
      <span>
        Année de section : <strong>{label || "—"}</strong>
      </span>
    </div>
  );
}

