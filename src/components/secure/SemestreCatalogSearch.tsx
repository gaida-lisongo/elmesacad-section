"use client";

import { Icon } from "@iconify/react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  fetchSemestreCatalogSearch,
  type SemestreCatalogPick,
} from "@/lib/semestre-search/fetchSemestreCatalogSearch";
import { HighlightMatch } from "@/lib/user-search/HighlightMatch";
import { userDatabaseSearchInputShellClass } from "@/components/secure/UserDatabaseSearch";

const listboxPanelClass =
  "absolute z-50 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-gray-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_-12px_rgba(5, 138, 197,0.2)] ring-1 ring-gray-200/50 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-900/98 dark:ring-gray-700/60";

export type SemestreCatalogSearchProps = {
  sectionId: string;
  onPick: (item: SemestreCatalogPick) => void;
  minQueryLength?: number;
  debounceMs?: number;
  resultLimit?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  placeholder?: string;
  highlightQuery?: boolean;
  clearOnSelect?: boolean;
};

/**
 * Saisie sur le slug ou la désignation d’une filière : liste les semestres de cette / ces filières (même UX que agents / étudiants).
 * La sélection préremplit la ligne (copie), sans réutiliser l’ObjectId Mongo.
 */
export function SemestreCatalogSearch({
  sectionId,
  onPick,
  minQueryLength = 2,
  debounceMs = 320,
  resultLimit = 20,
  className = "",
  inputClassName = "",
  disabled = false,
  id: idProp,
  "aria-label": ariaLabel,
  placeholder = "Filière : slug ou désignation…",
  highlightQuery = true,
  clearOnSelect = true,
}: SemestreCatalogSearchProps) {
  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const inputId = idProp ?? `${autoId}-input`;

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<SemestreCatalogPick[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const onPickRef = useRef(onPick);
  onPickRef.current = onPick;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [query, debounceMs]);

  useEffect(() => {
    if (!sectionId || debouncedQuery.length < minQueryLength) {
      setItems([]);
      setError(null);
      setLoading(false);
      return;
    }

    const ac = new AbortController();
    setLoading(true);
    setError(null);

    const run = async () => {
      try {
        const raw = await fetchSemestreCatalogSearch(sectionId, debouncedQuery, {
          signal: ac.signal,
          limit: resultLimit,
        });
        if (ac.signal.aborted) return;
        const byKey = new Map<string, SemestreCatalogPick>();
        for (const row of raw) {
          const k = `${row.id}`;
          if (!byKey.has(k)) byKey.set(k, row);
        }
        setItems([...byKey.values()]);
        setHighlight(0);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e.message : "Erreur inattendue");
          setItems([]);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    };

    void run();
    return () => ac.abort();
  }, [debouncedQuery, minQueryLength, sectionId, resultLimit]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const selectItem = useCallback(
    (item: SemestreCatalogPick) => {
      onPickRef.current(item);
      if (clearOnSelect) {
        setQuery("");
        setDebouncedQuery("");
        setItems([]);
      } else {
        setQuery(item.designation);
      }
      setOpen(false);
      inputRef.current?.blur();
    },
    [clearOnSelect]
  );

  const showPanel = open && debouncedQuery.length >= minQueryLength;
  const queryForHighlight = highlightQuery ? debouncedQuery : "";
  const showMinCharHint = open && query.trim().length < minQueryLength;

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!items.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = items[highlight];
      if (row) selectItem(row);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const canShowList = debouncedQuery.length >= minQueryLength;

  return (
    <div ref={rootRef} className={`relative w-full ${className}`.trim()}>
      <div className={userDatabaseSearchInputShellClass}>
        <Icon icon="solar:magnifer-bold-duotone" className="h-5 w-5 shrink-0 text-primary/70 dark:text-primary/80" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          disabled={disabled || !sectionId}
          aria-label={ariaLabel}
          aria-expanded={open && canShowList}
          aria-controls={listboxId}
          aria-autocomplete="list"
          role="combobox"
          placeholder={placeholder}
          className={`min-w-0 flex-1 bg-transparent text-sm text-midnight_text outline-none placeholder:text-gray-400 dark:text-white ${inputClassName}`.trim()}
        />
        {loading ? (
          <span
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary/30 border-t-primary dark:border-primary/20 dark:border-t-primary"
            role="status"
            aria-label="Chargement"
          />
        ) : null}
      </div>

      {showPanel ? (
        <div id={listboxId} role="listbox" className={listboxPanelClass}>
          {loading && !items.length ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary/30 border-t-primary dark:border-primary/20 dark:border-t-primary" />
                Recherche en cours…
              </span>
            </p>
          ) : null}

          {error ? (
            <p className="m-1 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-800 dark:bg-rose-950/50 dark:text-rose-200">
              {error}
            </p>
          ) : null}

          {!loading && !error && items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Aucune filière ne correspond à « {debouncedQuery} » (slug ou désignation), ou ses semestres ne sont pas encore
              définis. Ajustez la recherche ou saisissez le semestre à la main.
            </p>
          ) : null}

          {items.map((item, index) => {
            const active = index === highlight;
            const creditsLabel =
              item.credits != null && Number.isFinite(item.credits) ? `${item.credits} cr.` : null;
            return (
              <button
                type="button"
                key={item.id}
                role="option"
                aria-selected={active}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHighlight(index)}
                onClick={() => selectItem(item)}
                className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors ${
                  active
                    ? "bg-primary/8 ring-1 ring-primary/15 dark:bg-primary/10 dark:ring-primary/20"
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/80"
                }`}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 ring-2 ring-white shadow-md dark:bg-primary/15 dark:ring-gray-800">
                  <Icon icon="solar:calendar-bold-duotone" className="h-6 w-6 text-primary dark:text-emerald-300" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-midnight_text dark:text-white">
                      <HighlightMatch text={item.designation} query={queryForHighlight} />
                    </p>
                    {creditsLabel ? (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-emerald-200">
                        {creditsLabel}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                    Filière : <HighlightMatch text={item.filiereLabel} query={queryForHighlight} />
                    {item.filiereSlug ? (
                      <>
                        {" "}
                        ·{" "}
                        <span className="font-mono">
                          <HighlightMatch text={item.filiereSlug} query={queryForHighlight} />
                        </span>
                      </>
                    ) : null}
                  </p>
                </div>
                <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
              </button>
            );
          })}
        </div>
      ) : null}

      {showMinCharHint ? (
        <p className="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-400">
          Saisissez au moins {minQueryLength} caractères pour lancer la recherche.
        </p>
      ) : null}
    </div>
  );
}
