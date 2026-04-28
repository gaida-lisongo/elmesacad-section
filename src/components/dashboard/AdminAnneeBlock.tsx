"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import type { DashboardWhiteListItem } from "@/lib/dashboard/types";
import { formatAnneeTitle } from "@/lib/dashboard/formatAnneeTitle";
import { StatusSwitch } from "@/components/dashboard/StatusSwitch";

type AnneeFormState = { designation: string; debut: string; fin: string; status: boolean };

export function AdminAnneeBlock({ items: initial }: { items: DashboardWhiteListItem[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<AnneeFormState>({
    designation: "",
    debut: String(new Date().getFullYear()),
    fin: String(new Date().getFullYear() + 1),
    status: false,
  });
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setItems(initial);
  }, [initial]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy("create");
    try {
      const res = await fetch("/api/annee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          designation: form.designation.trim(),
          debut: Number(form.debut) || 0,
          fin: Number(form.fin) || 0,
          status: form.status,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Échec");
      setForm((f) => ({ ...f, designation: "" }));
      setFormOpen(false);
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const toggleStatus = async (id: string, status: boolean) => {
    setErr(null);
    setBusy(id);
    try {
      const res = await fetch(`/api/annee/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: !status }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Échec");
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const onDelete = async (id: string) => {
    if (!window.confirm("Supprimer cette année académique ?")) return;
    setErr(null);
    setBusy(`del-${id}`);
    try {
      const res = await fetch(`/api/annee/${id}`, { method: "DELETE" });
      const j = await res.json();
      if (!res.ok) throw new Error(j.message || "Échec");
      router.refresh();
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Années académiques</h2>
        <button
          type="button"
          onClick={() => {
            setFormOpen((o) => !o);
            setErr(null);
          }}
          className="group inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-50/90 px-3 py-2 text-xs font-medium text-sky-900 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-sky-500/50 hover:bg-sky-100 hover:shadow-md active:scale-[0.98] dark:border-sky-500/25 dark:bg-sky-950/50 dark:text-sky-100 dark:hover:border-sky-400/40 dark:hover:bg-sky-900/60"
        >
          <Icon
            icon={formOpen ? "solar:close-circle-linear" : "solar:add-circle-linear"}
            className="size-4 transition-transform duration-300 group-hover:rotate-90"
            aria-hidden
          />
          <span>{formOpen ? "Fermer" : "Ajouter une année"}</span>
        </button>
      </div>

      {err && (
        <p className="animate-dashboard-in text-xs text-red-600" role="alert">
          {err}
        </p>
      )}

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
          formOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            inert={!formOpen}
            aria-hidden={!formOpen}
            onSubmit={onCreate}
            className="space-y-3 rounded-xl border border-sky-200/60 bg-gradient-to-br from-sky-50/80 to-white p-4 shadow-sm dark:border-sky-900/50 dark:from-sky-950/40 dark:to-gray-900/80"
          >
            <p className="text-xs font-medium text-midnight_text/80 dark:text-gray-300">Nouvelle année</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm text-midnight_text shadow-sm transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 dark:border-gray-600 dark:bg-gray-800/90 dark:text-white"
                placeholder="Désignation (optionnel, ex. 2023-2024)"
                value={form.designation}
                onChange={(e) => setForm((f) => ({ ...f, designation: e.target.value }))}
              />
              <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white/50 px-3 py-2 dark:border-gray-600 dark:bg-gray-800/50">
                <span className="text-xs text-gray-500">Actif</span>
                <StatusSwitch
                  active={form.status}
                  busy={false}
                  disabled={false}
                  onToggle={() => setForm((f) => ({ ...f, status: !f.status }))}
                />
              </div>
              <input
                type="number"
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/90"
                placeholder="Année début"
                value={form.debut}
                onChange={(e) => setForm((f) => ({ ...f, debut: e.target.value }))}
              />
              <input
                type="number"
                className="rounded-lg border border-gray-200 bg-white/90 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800/90"
                placeholder="Année fin"
                value={form.fin}
                onChange={(e) => setForm((f) => ({ ...f, fin: e.target.value }))}
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={busy === "create" || !formOpen}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-4 py-2 text-xs font-semibold text-white shadow-md transition duration-300 hover:shadow-lg hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                {busy === "create" ? (
                  <Icon icon="svg-spinners:ring-resize" className="size-4" />
                ) : (
                  <Icon icon="solar:check-circle-linear" className="size-4" />
                )}
                Enregistrer
              </button>
            </div>
          </form>
        </div>
      </div>

      <ul className="max-h-52 space-y-2 overflow-y-auto overflow-x-hidden pr-0.5">
        {items.length === 0 && (
          <li className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-500 dark:border-gray-700">
            Aucune année enregistrée.
          </li>
        )}
        {items.map((it, idx) => {
          const title = formatAnneeTitle(it.debut, it.fin);
          const sub =
            it.designation.trim() && it.designation !== title ? it.designation.trim() : null;
          return (
            <li
              key={it.id ?? it.slug}
              className="animate-dashboard-in"
              style={{ animationDelay: `${idx * 45}ms` }}
            >
              <div className="group/row flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-100 bg-white/90 px-3 py-3 shadow-sm transition duration-300 hover:border-sky-200/60 hover:shadow-md dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-sky-800/60">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold tracking-tight text-midnight_text dark:text-white">{title}</p>
                  {sub && <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{sub}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {it.id && (
                    <StatusSwitch
                      active={it.status}
                      busy={busy === it.id}
                      disabled={busy != null}
                      onToggle={() => void toggleStatus(it.id!, it.status)}
                    />
                  )}
                  {it.id && (
                    <button
                      type="button"
                      title="Supprimer"
                      disabled={busy != null}
                      onClick={() => onDelete(it.id!)}
                      className="inline-flex size-9 items-center justify-center rounded-lg border border-red-200/80 text-red-600 transition duration-200 hover:scale-105 hover:border-red-400 hover:bg-red-50 active:scale-95 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/50"
                    >
                      {busy === `del-${it.id}` ? (
                        <Icon icon="svg-spinners:ring-resize" className="size-4" />
                      ) : (
                        <Icon icon="solar:trash-bin-trash-linear" className="size-5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
