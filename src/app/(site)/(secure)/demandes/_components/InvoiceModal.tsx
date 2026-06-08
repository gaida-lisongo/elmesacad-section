"use client";

import { useCallback, useState } from "react";
import { Icon } from "@iconify/react";
import type { OrderData } from "./OrderCard";
import { factureSendMailAction } from "@/actions/factureSendMailAction";

// ─── Props ────────────────────────────────────────────────────────
type Props = {
  order: OrderData;
  open: boolean;
  onClose: () => void;
};

// ─── Invoice HTML builder (used for both preview & email) ─────────
export function buildInvoiceHtml(order: OrderData): string {
  const { student, transaction, status, createdAt, _id } = order;
  const date = new Date(createdAt).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  const time = new Date(createdAt).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusLabel =
    status === "paid"
      ? "Payé"
      : status === "pending"
        ? "En attente"
        : status === "failed"
          ? "Échoué"
          : status === "completed"
            ? "Terminé"
            : status;

  const statusColor =
    status === "paid" || status === "completed"
      ? "#059669"
      : status === "pending"
        ? "#d97706"
        : status === "failed"
          ? "#e11d48"
          : "#6b7280";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      background:#f3f4f6; padding:32px; color:#111827;
    }
    .invoice-wrap {
      max-width:820px; margin:0 auto; background:#fff;
      border-radius:20px; box-shadow:0 4px 24px rgba(0,0,0,.08);
      overflow:hidden;
    }
    /* Header */
    .invoice-header {
      background:linear-gradient(135deg,#1e3a5f 0%,#0f2b45 100%);
      padding:32px 40px; color:#fff;
      display:flex; justify-content:space-between; align-items:center;
    }
    .invoice-header h1 {
      font-size:22px; font-weight:700; letter-spacing:-.3px;
    }
    .invoice-header .badge {
      display:inline-flex; align-items:center; gap:6px;
      padding:6px 16px; border-radius:999px;
      font-size:12px; font-weight:600; background:${statusColor};
      color:#fff;
    }
    .invoice-body { padding:32px 40px; }
    /* Info grid */
    .info-grid {
      display:grid; grid-template-columns:1fr 1fr; gap:24px;
      margin-bottom:28px;
    }
    .info-block h3 {
      font-size:10px; font-weight:600; text-transform:uppercase;
      letter-spacing:.8px; color:#9ca3af; margin-bottom:6px;
    }
    .info-block p { font-size:14px; color:#111827; line-height:1.5; }
    .info-block .mono { font-family:'Courier New',monospace; font-size:13px; }
    /* Table */
    table { width:100%; border-collapse:collapse; margin-bottom:24px; }
    thead th {
      text-align:left; font-size:11px; font-weight:600; text-transform:uppercase;
      letter-spacing:.5px; color:#9ca3af; padding:10px 0 6px;
      border-bottom:1px solid #e5e7eb;
    }
    tbody td {
      padding:10px 0; font-size:14px; color:#111827;
      border-bottom:1px solid #f3f4f6;
    }
    tbody td:last-child, thead th:last-child { text-align:right; }
    .total-row td {
      font-weight:700; font-size:16px; padding-top:14px;
      border-bottom:none;
    }
    .total-row td:last-child { font-size:20px; color:#1e3a5f; }
    /* Footer */
    .invoice-footer {
      padding:20px 40px; background:#f9fafb;
      border-top:1px solid #e5e7eb;
      display:flex; justify-content:space-between;
      font-size:12px; color:#6b7280;
    }
    @media print {
      body { background:#fff; padding:16px; }
      .invoice-wrap { box-shadow:none; border:1px solid #e5e7eb; }
      .no-print { display:none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-wrap">
    <div class="invoice-header">
      <div>
        <h1>FACTURE</h1>
        <p style="font-size:13px;color:#93c5fd;margin-top:4px;">
          Commande #${transaction.orderNumber}
        </p>
      </div>
      <div class="badge">${statusLabel}</div>
    </div>

    <div class="invoice-body">
      <div class="info-grid">
        <div class="info-block">
          <h3>Étudiant</h3>
          <p><strong>${student.nom}</strong></p>
          <p style="color:#6b7280;font-size:13px;">${student.email}</p>
          <p class="mono" style="color:#6b7280;font-size:12px;">Matricule: ${student.matricule}</p>
        </div>
        <div class="info-block" style="text-align:right;">
          <h3>Facture</h3>
          <p class="mono">#${_id.slice(-10).toUpperCase()}</p>
          <p style="color:#6b7280;font-size:13px;">${date} à ${time}</p>
          <p style="color:#6b7280;font-size:13px;">Réf. recharge: ${order.rechargeId}</p>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Montant</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Frais d'inscription — ${transaction.categorie}</td>
            <td>${transaction.amount.toLocaleString("fr-FR")} ${transaction.currency}</td>
          </tr>
          <tr>
            <td style="color:#6b7280;font-size:12px;">
              Téléphone: ${transaction.phoneNumber}
              ${transaction.providerInfo ? "<br/>" + transaction.providerInfo : ""}
            </td>
            <td></td>
          </tr>
          <tr class="total-row">
            <td>Total</td>
            <td>${transaction.amount.toLocaleString("fr-FR")} ${transaction.currency}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="invoice-footer">
      <span>INBTP — Institut National du Bâtiment et des Travaux Publics</span>
      <span>Facture générée le ${date}</span>
    </div>
  </div>
</body>
</html>`;
}

// ─── React Component ──────────────────────────────────────────────
export default function InvoiceModal({ order, open, onClose }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const htmlInvoice = buildInvoiceHtml(order);

  const handlePrint = useCallback(() => {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(htmlInvoice);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }, [htmlInvoice]);

  const handleSendEmail = useCallback(async () => {
    setSending(true);
    setError(null);
    setSent(false);

    try {
      const res = await factureSendMailAction(
        order.student.email,
        order.student.nom,
        htmlInvoice
      );

      if (!res.ok) {
        setError(res.message);
      } else {
        setSent(true);
        setTimeout(() => setSent(false), 4000);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSending(false);
    }
  }, [order, htmlInvoice]);

  // ── Block body scroll ─────────────────────────────────────────
  // (Simple — no extra useEffect needed since modal unmounts on close)

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Facture de commande"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900">
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/60 text-white shadow-sm">
              <Icon icon="solar:bill-check-bold-duotone" className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                Facture
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                #{order.transaction.orderNumber}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            aria-label="Fermer"
          >
            <Icon icon="solar:close-circle-linear" className="h-6 w-6" />
          </button>
        </div>

        {/* ── Invoice Preview ────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4 sm:p-6 dark:bg-gray-800/50">
          <iframe
            title="Aperçu facture"
            srcDoc={htmlInvoice}
            className="h-full min-h-[400px] w-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700"
          />
        </div>

        {/* ── Footer Actions ─────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {sent && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icon icon="solar:check-circle-bold" className="h-4 w-4" />
                Envoyée
              </span>
            )}
            {error && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-3 py-1 text-xs font-medium text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                <Icon icon="solar:danger-triangle-bold" className="h-4 w-4" />
                {error}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSendEmail}
              disabled={sending || sent}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:shadow disabled:opacity-50 disabled:cursor-not-allowed dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              <Icon
                icon={sending ? "solar:spinner-bold-duotone" : "solar:letter-bold-duotone"}
                className={`h-4 w-4 ${sending ? "animate-spin" : ""}`}
              />
              {sending ? "Envoi..." : "Envoyer par email"}
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 hover:shadow-md active:scale-[0.98]"
            >
              <Icon icon="solar:printer-bold-duotone" className="h-4 w-4" />
              Imprimer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}