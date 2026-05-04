"use client";

import { Icon } from "@iconify/react";
import Image from "next/image";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { fetchUserSearch } from "@/lib/user-search/fetchUserSearch";
import { HighlightMatch } from "@/lib/user-search/HighlightMatch";
import type { Agent } from "@/lib/models/User";
import type { AgentListItem, StudentListItem } from "@/lib/services/UserManager";

const defaultPhoto = "/images/user.jpg";

/** Conteneur du champ (même apparence que la recherche agents / étudiants) — réutilisable pour d’autres catalogues. */
export const userDatabaseSearchInputShellClass =
  "peer flex w-full items-center gap-2 rounded-2xl border border-gray-200/90 bg-gradient-to-r from-white to-gray-50/90 px-3 py-2.5 shadow-sm transition-all duration-200 focus-within:border-primary/35 focus-within:ring-2 focus-within:ring-primary/12 dark:from-gray-900 dark:to-gray-900/95 dark:border-gray-600";

const inputShellClass = userDatabaseSearchInputShellClass;

type CommonUserSearchProps = {
  minQueryLength?: number;
  debounceMs?: number;
  resultLimit?: number;
  className?: string;
  inputClassName?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
  "aria-label"?: string;
  /** Valeur initiale du champ ; pour forcer un reset, changez `key` sur le composant */
  defaultQuery?: string;
  highlightQuery?: boolean;
  clearOnSelect?: boolean;
  showContextBadge?: boolean;
  placeholder?: string;
  /**
   * Affiche la liste dans un portail (position fixe), pour les parents en overflow masqué
   * (ex. tiroir / modale).
   */
  listboxAppendToBody?: boolean;
};

type AgentUserSearchProps = CommonUserSearchProps & {
  kind: "agent";
  agentRole?: Agent["role"];
  onSelect: (item: AgentListItem) => void;
};

type StudentUserSearchProps = CommonUserSearchProps & {
  kind: "student";
  studentCycle?: string;
  onSelect: (item: StudentListItem) => void;
};

export type UserDatabaseSearchProps = AgentUserSearchProps | StudentUserSearchProps;

function ResultAvatar({ src }: { src: string }) {
  return (
    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl ring-2 ring-white shadow-md dark:ring-gray-800">
      <Image
        src={src || defaultPhoto}
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 object-cover"
      />
    </div>
  );
}

/**
 * Recherche asynchrone (nom, e-mail, matricule) via `/api/agent` ou `/api/student`.
 * Loader, liste déroulante, navigation clavier, badge rôle ou cycle.
 */
export function UserDatabaseSearch(props: UserDatabaseSearchProps) {
  const {
    kind,
    minQueryLength = 2,
    debounceMs = 320,
    resultLimit = 12,
    className = "",
    inputClassName = "",
    disabled = false,
    name,
    id: idProp,
    "aria-label": ariaLabel,
    defaultQuery = "",
    highlightQuery = true,
    clearOnSelect = false,
    showContextBadge = true,
    placeholder = "Rechercher par nom, e-mail ou matricule…",
    listboxAppendToBody = false,
  } = props;

  const agentRole = kind === "agent" ? props.agentRole : undefined;
  const studentCycle = kind === "student" ? props.studentCycle : undefined;

  const autoId = useId();
  const listboxId = `${autoId}-listbox`;
  const inputId = idProp ?? `${autoId}-input`;

  const [query, setQuery] = useState(() => defaultQuery);
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<(AgentListItem | StudentListItem)[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listboxPanelRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [listboxViewportRect, setListboxViewportRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, debounceMs);
    return () => window.clearTimeout(t);
  }, [query, debounceMs]);

  useEffect(() => {
    if (debouncedQuery.length < minQueryLength) {
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
        const commonOpts = {
          signal: ac.signal,
          limit: resultLimit,
          offset: 0,
          agentRole,
          studentCycle,
        };
        const raw =
          kind === "agent"
            ? await fetchUserSearch("agent", debouncedQuery, commonOpts)
            : await fetchUserSearch("student", debouncedQuery, commonOpts);
        if (ac.signal.aborted) {
          return;
        }
        const byId = new Map<string, AgentListItem | StudentListItem>();
        for (const row of raw) {
          if (!byId.has(row.id)) {
            byId.set(row.id, row);
          }
        }
        setItems([...byId.values()]);
        setHighlight(0);
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          return;
        }
        if (!ac.signal.aborted) {
          setError(e instanceof Error ? e.message : "Erreur inattendue");
          setItems([]);
        }
      } finally {
        if (!ac.signal.aborted) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => ac.abort();
  }, [debouncedQuery, minQueryLength, kind, resultLimit, agentRole, studentCycle]);

  const showPanel = open && debouncedQuery.length >= minQueryLength;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || listboxPanelRef.current?.contains(t)) {
        return;
      }
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useLayoutEffect(() => {
    if (!listboxAppendToBody || !showPanel) {
      setListboxViewportRect(null);
      return;
    }
    const root = rootRef.current;
    if (!root) return;
    const sync = () => {
      const r = root.getBoundingClientRect();
      setListboxViewportRect({
        top: r.bottom + 8,
        left: r.left,
        width: r.width,
      });
    };
    sync();
    window.addEventListener("scroll", sync, true);
    window.addEventListener("resize", sync);
    return () => {
      window.removeEventListener("scroll", sync, true);
      window.removeEventListener("resize", sync);
    };
  }, [listboxAppendToBody, showPanel, debouncedQuery, loading, items.length]);

  const selectItem = useCallback(
    (item: AgentListItem | StudentListItem) => {
      const p = propsRef.current;
      if (kind === "agent") {
        (p as AgentUserSearchProps).onSelect(item as AgentListItem);
      } else {
        (p as StudentUserSearchProps).onSelect(item as StudentListItem);
      }
      if (clearOnSelect) {
        setQuery("");
        setDebouncedQuery("");
        setItems([]);
      } else {
        setQuery(item.name);
      }
      setOpen(false);
      inputRef.current?.blur();
    },
    [clearOnSelect, kind]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!items.length) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const row = items[highlight];
      if (row) {
        selectItem(row);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const canShowList = debouncedQuery.length >= minQueryLength;
  const queryForHighlight = highlightQuery ? debouncedQuery : "";
  const showMinCharHint = open && query.trim().length < minQueryLength;

  const listboxShellClass =
    "max-h-80 overflow-y-auto rounded-2xl border border-gray-200/90 bg-white/95 p-1.5 shadow-[0_20px_50px_-12px_rgba(5, 138, 197,0.2)] ring-1 ring-gray-200/50 backdrop-blur-sm dark:border-gray-600 dark:bg-gray-900/98 dark:ring-gray-700/60";

  const listboxBody = (
    <>
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
          Aucun résultat pour « {debouncedQuery} »
        </p>
      ) : null}

      {items.map((item, index) => {
        const active = index === highlight;
        const context =
          kind === "agent" ? (item as AgentListItem).role : (item as StudentListItem).cycle;

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
            <ResultAvatar src={item.photo} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate font-semibold text-midnight_text dark:text-white">
                  <HighlightMatch text={item.name} query={queryForHighlight} />
                </p>
                {showContextBadge && context ? (
                  <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary dark:bg-primary/20 dark:text-emerald-200">
                    {context}
                  </span>
                ) : null}
              </div>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
                <Icon icon="solar:letter-bold-duotone" className="h-3.5 w-3.5 shrink-0 text-primary/60" />
                <span>
                  <HighlightMatch text={item.email} query={queryForHighlight} />
                </span>
              </p>
              <p className="mt-1 text-[11px] font-medium text-gray-500 dark:text-gray-500">
                <span className="text-gray-400">Mat. </span>
                <span className="text-midnight_text dark:text-gray-200">
                  <HighlightMatch text={item.matricule} query={queryForHighlight} />
                </span>
              </p>
            </div>
            <Icon icon="solar:alt-arrow-right-linear" className="h-4 w-4 shrink-0 text-gray-300 dark:text-gray-600" />
          </button>
        );
      })}
    </>
  );

  return (
    <div ref={rootRef} className={`relative w-full ${className}`.trim()}>
      <div className={inputShellClass}>
        <Icon icon="solar:magnifer-bold-duotone" className="h-5 w-5 shrink-0 text-primary/70 dark:text-primary/80" />
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          name={name}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          autoCorrect="off"
          disabled={disabled}
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

      {showPanel && !listboxAppendToBody ? (
        <div id={listboxId} role="listbox" className={`absolute z-50 mt-2 w-full ${listboxShellClass}`}>
          {listboxBody}
        </div>
      ) : null}

      {showPanel && listboxAppendToBody && listboxViewportRect && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={listboxPanelRef}
              id={listboxId}
              role="listbox"
              className={`fixed z-[220] ${listboxShellClass}`}
              style={{
                top: listboxViewportRect.top,
                left: listboxViewportRect.left,
                width: listboxViewportRect.width,
              }}
            >
              {listboxBody}
            </div>,
            document.body
          )
        : null}

      {showMinCharHint ? (
        <p className="mt-1.5 px-1 text-xs text-gray-500 dark:text-gray-400">
          Saisissez au moins {minQueryLength} caractères pour lancer la recherche.
        </p>
      ) : null}
    </div>
  );
}

/** Alias `SearchUser` (recherche agent / étudiant). */
export { UserDatabaseSearch as SearchUser };
