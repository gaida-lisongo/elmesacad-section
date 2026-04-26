"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Row = {
  id: string;
  reference: string;
  objet: string;
  email: string;
  nomComplet: string;
  status: string;
  createdAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};

export default function TicketsListPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const sp = new URLSearchParams();
    sp.set("search", search);
    sp.set("status", status);
    sp.set("page", "0");
    sp.set("limit", "50");
    const res = await fetch(`/api/tickets?${sp.toString()}`);
    const j = await res.json();
    if (res.status === 401) {
      router.push("/");
      return;
    }
    if (!res.ok) {
      setErr(j.message || "Chargement impossible");
      return;
    }
    setRows(j.data);
    setTotal(j.total);
  }, [search, status, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section className="space-y-6 p-4">
      <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Tickets support</h1>
      <div className="flex flex-wrap gap-2">
        <input
          className="min-w-[12rem] rounded border border-border px-3 py-2 text-sm dark:border-dark_border dark:bg-gray-900"
          placeholder="Recherche (réf., e-mail, nom…)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="rounded border border-border px-3 py-2 text-sm dark:border-dark_border dark:bg-gray-900"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="all">Tous</option>
          <option value="pending">En attente</option>
          <option value="en_cours">En cours</option>
          <option value="resolu">Résolu</option>
          <option value="ferme">Fermé</option>
        </select>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded border border-border px-3 py-2 text-sm dark:border-dark_border"
        >
          Actualiser
        </button>
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <p className="text-sm text-gray-500">{total} ticket(s)</p>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border dark:border-dark_border">
              <th className="px-2 py-2">Réf.</th>
              <th className="px-2 py-2">Objet</th>
              <th className="px-2 py-2">Demandeur</th>
              <th className="px-2 py-2">Statut</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 dark:border-gray-800">
                <td className="px-2 py-2 font-mono text-xs">{r.reference}</td>
                <td className="max-w-xs truncate px-2 py-2">{r.objet}</td>
                <td className="px-2 py-2">
                  {r.nomComplet}
                  <br />
                  <span className="text-xs text-gray-500">{r.email}</span>
                </td>
                <td className="px-2 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="px-2 py-2 text-right">
                  <Link
                    className="text-primary underline"
                    href={`/tickets/${r.id}`}
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
