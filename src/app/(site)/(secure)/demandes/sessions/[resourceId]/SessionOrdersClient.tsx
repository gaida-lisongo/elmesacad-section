"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import type { OrderData } from "../../_components/OrderCard";
import { OrderCard } from "../../_components/OrderCard";

type Props = {
  orders: OrderData[];
  designation: string;
  resourceId: string;
};

export default function SessionOrdersClient({ orders, designation, resourceId }: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredOrders = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    return orders.filter((o) => {
      // Status filter
      if (statusFilter !== "all" && o.status !== statusFilter) return false;
      // Search filter (nom, matricule, email, orderNumber)
      if (!trimmed) return true;
      return (
        o.student.nom.toLowerCase().includes(trimmed) ||
        o.student.matricule.toLowerCase().includes(trimmed) ||
        o.student.email.toLowerCase().includes(trimmed) ||
        o.transaction.orderNumber.toLowerCase().includes(trimmed)
      );
    });
  }, [orders, searchTerm, statusFilter]);

  return (
    <div className="w-full min-w-0 space-y-6">
      {/* Header */}
      <header className="border-b border-gray-200 pb-4 dark:border-gray-700">
        <Link
          href="/demandes"
          className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          <Icon icon="solar:arrow-left-linear" className="h-4 w-4" aria-hidden />
          Demandes
        </Link>
        <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold text-midnight_text dark:text-white">
          <Icon
            icon="solar:cart-check-bold-duotone"
            className="h-8 w-8 shrink-0 text-primary"
            aria-hidden
          />
          Commandes — {designation}
        </h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Ressource <code className="rounded bg-gray-100 px-1 text-xs dark:bg-gray-800">{resourceId}</code>
        </p>
      </header>

      {/* Search & Filters toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Icon
            icon="solar:magnifer-linear"
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"
            aria-hidden
          />
          <input
            type="text"
            placeholder="Rechercher par nom, matricule, email ou n° commande…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Statut :</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          >
            <option value="all">Tous</option>
            <option value="paid">Payés</option>
            <option value="pending">En attente</option>
            <option value="failed">Échoués</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {filteredOrders.length} commande{filteredOrders.length !== 1 ? "s" : ""}
        {searchTerm.trim() || statusFilter !== "all"
          ? ` sur ${orders.length} au total`
          : ""}
      </p>

      {/* Orders list */}
      {filteredOrders.length > 0 ? (
        <div className="space-y-3">
          {filteredOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              renderActions={(o: OrderData) => (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  onClick={() => {
                    // Logique pour gérer les actions sur la commande
                    alert(`Actions pour la commande ${o.transaction.orderNumber}`);
                  }}
                >
                  Gérer
                </button>
              )}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Icon
            icon="solar:box-minimalistic-broken"
            className="h-16 w-16 text-gray-300 dark:text-gray-600"
          />
          <p className="mt-4 text-lg font-medium text-gray-500 dark:text-gray-400">
            {searchTerm.trim() || statusFilter !== "all"
              ? "Aucune commande ne correspond aux filtres."
              : "Aucune commande pour cette session."}
          </p>
          {(searchTerm.trim() || statusFilter !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setStatusFilter("all");
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Réinitialiser les filtres
            </button>
          )}
        </div>
      )}
    </div>
  );
}