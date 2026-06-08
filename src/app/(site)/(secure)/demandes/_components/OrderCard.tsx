"use client";

import React from "react";
import Image from "next/image";
import { Icon } from "@iconify/react";

// ─── Types ─────────────────────────────────────────────────────────
export interface Student {
  nom: string;
  matricule: string;
  email: string;
}

export interface Transaction {
  _id: string;
  categorie: string;
  orderNumber: string;
  amount: number;
  currency: string;
  phoneNumber: string;
  providerInfo: string;
}

export interface OrderData {
  _id: string;
  student: Student;
  transaction: Transaction;
  status: string;
  createdAt: string | Date;
  rechargeId: string;
}

interface OrderCardProps {
  order: OrderData;
  /** Action(s) injectée(s) en pied de carte */
  renderActions?: (order: OrderData) => React.ReactNode;
  /** Image de couverture (par défaut : /images/inbtp/jpg/img-1.jpg) */
  imageSrc?: string;
}

// ─── Status meta ───────────────────────────────────────────────────
const STATUS_META: Record<
  string,
  { label: string; bg: string; text: string; dot: string }
> = {
  paid: {
    label: "Payé",
    bg: "bg-emerald-50/95 dark:bg-emerald-900/40",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  completed: {
    label: "Terminé",
    bg: "bg-blue-50/95 dark:bg-blue-900/40",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  pending: {
    label: "En attente",
    bg: "bg-amber-50/95 dark:bg-amber-900/40",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  failed: {
    label: "Échoué",
    bg: "bg-rose-50/95 dark:bg-rose-900/40",
    text: "text-rose-700 dark:text-rose-300",
    dot: "bg-rose-500",
  },
};

function getStatusMeta(status: string) {
  return (
    STATUS_META[status] ?? {
      label: status,
      bg: "bg-gray-100/95 dark:bg-gray-800/80",
      text: "text-gray-700 dark:text-gray-300",
      dot: "bg-gray-400",
    }
  );
}

function getInitials(name: string) {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join("") || "?"
  );
}

// ─── Component ─────────────────────────────────────────────────────
export const OrderCard: React.FC<OrderCardProps> = ({
  order,
  renderActions,
  imageSrc = "/images/inbtp/jpg/img-1.jpg",
}) => {
  const { student, transaction, status, createdAt } = order;
  const meta = getStatusMeta(status);

  const dateObj = new Date(createdAt);
  const formattedDate = dateObj.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const formattedTime = dateObj.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const providerWarning = transaction.providerInfo?.includes("pas réussi");

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl dark:border-gray-700 dark:bg-gray-900">
      {/* ── Cover Image ──────────────────────────────────────────── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        <Image
          src={imageSrc}
          alt={`Commande ${transaction.orderNumber}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />
        {/* Dark gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

        {/* Status badge (top-left) */}
        <div
          className={`absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm ring-1 ring-white/40 backdrop-blur-md ${meta.bg} ${meta.text}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${meta.dot} animate-pulse`} />
          {meta.label}
        </div>

        {/* Price badge (top-right) */}
        <div className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-sm font-bold text-gray-900 shadow-md backdrop-blur dark:bg-gray-900/95 dark:text-white">
          {transaction.amount.toLocaleString("fr-FR")}{" "}
          <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
            {transaction.currency}
          </span>
        </div>

        {/* Order number (bottom over image) */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center gap-2 text-white">
          <Icon
            icon="solar:bill-list-bold-duotone"
            className="h-4 w-4 shrink-0 text-white/90"
            aria-hidden
          />
          <span className="truncate font-mono text-xs font-medium">
            #{transaction.orderNumber}
          </span>
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Student */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-gray-900">
            {getInitials(student.nom)}
          </div>
          <div className="min-w-0 flex-1">
            <h3
              className="truncate text-sm font-bold text-gray-900 dark:text-white"
              title={student.nom}
            >
              {student.nom}
            </h3>
            <p
              className="truncate text-xs text-gray-500 dark:text-gray-400"
              title={student.email}
            >
              {student.email}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent dark:via-gray-700" />

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <Icon icon="solar:user-id-bold-duotone" className="h-3 w-3" aria-hidden />
              Matricule
            </dt>
            <dd className="truncate font-mono text-xs font-semibold text-gray-700 dark:text-gray-300">
              {student.matricule}
            </dd>
          </div>

          <div className="flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <Icon icon="solar:phone-bold-duotone" className="h-3 w-3" aria-hidden />
              Téléphone
            </dt>
            <dd
              className="truncate font-mono text-xs font-semibold text-gray-700 dark:text-gray-300"
              title={transaction.phoneNumber}
            >
              {transaction.phoneNumber}
            </dd>
          </div>

          <div className="col-span-2 flex flex-col gap-0.5">
            <dt className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wider text-gray-400">
              <Icon icon="solar:calendar-bold-duotone" className="h-3 w-3" aria-hidden />
              Date de commande
            </dt>
            <dd className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {formattedDate}{" "}
              <span className="text-gray-400">· {formattedTime}</span>
            </dd>
          </div>
        </dl>

        {/* Provider warning */}
        {providerWarning && (
          <div className="flex items-start gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-[11px] text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
            <Icon
              icon="solar:danger-triangle-bold"
              className="mt-0.5 h-3.5 w-3.5 shrink-0"
              aria-hidden
            />
            <span className="line-clamp-2">{transaction.providerInfo}</span>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Actions */}
        {renderActions && (
          <div className="mt-1 flex w-full items-center gap-2 border-t border-gray-100 pt-3 dark:border-gray-800 [&>*]:flex-1">
            {renderActions(order)}
          </div>
        )}
      </div>
    </article>
  );
};