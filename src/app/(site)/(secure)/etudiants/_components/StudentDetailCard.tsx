'use client';

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react";
import { STUDENT_CYCLES } from "@/lib/constants/studentCycles";

export type StudentDepositView = {
  id: string;
  orderNumber?: string;
  amount: number;
  currency: "USD" | "CDF";
  phoneNumber: string;
  status: "pending" | "paid" | "failed";
  createdAt?: string;
};

export type StudentDetailView = {
  id: string;
  name: string;
  email: string;
  matricule: string;
  diplome: string;
  photo: string;
  status: "active" | "inactive";
  cycle: string;
  deposits?: StudentDepositView[];
};

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition-all duration-200 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

const tabBase =
  "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-300";

function messageFromInitPaymentResponse(payload: Record<string, unknown>): string {
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  const collect = payload.collect;
  if (collect && typeof collect === "object" && collect !== null) {
    const c = collect as Record<string, unknown>;
    if (typeof c.message === "string" && c.message.trim()) {
      return c.message.trim();
    }
  }
  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }
  return "Réponse reçue.";
}

function messageFromCreditResponse(payload: Record<string, unknown>): string {
  if (typeof payload.error === "string" && payload.error.trim() && !payload.check) {
    return payload.error.trim();
  }
  const check = payload.check;
  if (check && typeof check === "object" && check !== null) {
    const ch = check as Record<string, unknown>;
    if (typeof ch.message === "string" && ch.message.trim()) {
      return ch.message.trim();
    }
  }
  if (typeof payload.message === "string" && payload.message.trim()) {
    return payload.message.trim();
  }
  return "Vérification effectuée.";
}

type Props = { student: StudentDetailView };

export default function StudentDetailCard({ student: initial }: Props) {
  const [activeTab, setActiveTab] = useState<"informations" | "depots">("informations");
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [matricule, setMatricule] = useState(initial.matricule);
  const [diplome, setDiplome] = useState(initial.diplome);
  const [cycle, setCycle] = useState(initial.cycle);
  const [isSavingInfo, setIsSavingInfo] = useState(false);
  const [recharges, setRecharges] = useState<StudentDepositView[]>([]);
  const [rechargesTotal, setRechargesTotal] = useState(0);
  const [rechargesPage, setRechargesPage] = useState(0);
  const rechargesPageSize = 20;
  const [rechargeStatus, setRechargeStatus] = useState<"all" | "pending" | "paid" | "failed">("all");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [rechargesLoading, setRechargesLoading] = useState(false);
  const [newAmount, setNewAmount] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCurrency, setNewCurrency] = useState<"USD" | "CDF">("USD");
  const [addDepositLoading, setAddDepositLoading] = useState(false);
  const [paymentAlertText, setPaymentAlertText] = useState<string | null>(null);
  const [paymentLoading, setPaymentLoading] = useState<string | null>(null);
  const [creditLoading, setCreditLoading] = useState<string | null>(null);
  const [creditAlertText, setCreditAlertText] = useState<string | null>(null);

  const loadRecharges = useCallback(async () => {
    setRechargesLoading(true);
    try {
      const offset = rechargesPage * rechargesPageSize;
      const params = new URLSearchParams({
        offset: String(offset),
        limit: String(rechargesPageSize),
        status: rechargeStatus,
        search: searchQuery,
      });
      const res = await fetch(`/api/student/${initial.id}/recharges?${params.toString()}`);
      const payload = (await res.json()) as {
        data: StudentDepositView[];
        pagination: { total: number };
      };
      if (res.ok) {
        setRecharges(payload.data ?? []);
        setRechargesTotal(payload.pagination?.total ?? 0);
      }
    } finally {
      setRechargesLoading(false);
    }
  }, [initial.id, rechargesPage, rechargeStatus, searchQuery, rechargesPageSize]);

  useEffect(() => {
    if (searchDebounce.current) {
      clearTimeout(searchDebounce.current);
    }
    searchDebounce.current = setTimeout(() => {
      setSearchQuery(searchInput);
      setRechargesPage(0);
    }, 400);
    return () => {
      if (searchDebounce.current) {
        clearTimeout(searchDebounce.current);
      }
    };
  }, [searchInput]);

  useEffect(() => {
    if (activeTab === "depots") {
      void loadRecharges();
    }
  }, [activeTab, loadRecharges]);

  const totalPages = Math.max(1, Math.ceil(rechargesTotal / rechargesPageSize) || 1);
  useEffect(() => {
    if (rechargesPage > 0 && rechargesPage >= totalPages) {
      setRechargesPage(Math.max(0, totalPages - 1));
    }
  }, [rechargesPage, totalPages]);

  const saveInformations = async () => {
    setIsSavingInfo(true);
    try {
      await fetch(`/api/student/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, matricule, diplome, cycle }),
      });
    } finally {
      setIsSavingInfo(false);
    }
  };

  const addDeposit = async () => {
    const amount = Number(newAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    if (!newPhone.trim() || newPhone.trim().length < 6) {
      return;
    }
    setAddDepositLoading(true);
    try {
      const res = await fetch(`/api/student/${initial.id}/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          currency: newCurrency,
          phoneNumber: newPhone.trim(),
        }),
      });
      const payload = (await res.json()) as { data?: { recharge?: StudentDepositView } };
      if (!res.ok || !payload?.data?.recharge) {
        return;
      }
      setNewAmount("");
      setNewPhone("");
      setRechargeStatus("all");
      setSearchInput("");
      setSearchQuery("");
      setRechargesPage(0);
      await loadRecharges();
    } finally {
      setAddDepositLoading(false);
    }
  };

  const requestInitPayment = async (rechargeId: string) => {
    setPaymentLoading(rechargeId);
    setPaymentAlertText(null);
    try {
      const res = await fetch(`/api/student/${initial.id}/deposits/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rechargeId }),
      });
      const payload = (await res.json()) as Record<string, unknown>;
      console.log("[client] /api/student/.../deposits/payment — réponse:", payload);
      setPaymentAlertText(messageFromInitPaymentResponse(payload));
      if (!res.ok) {
        return;
      }
      const dataPayload = payload.data;
      const nestedOrder =
        dataPayload && typeof dataPayload === "object" && dataPayload !== null
          ? (dataPayload as { orderNumber?: string }).orderNumber
          : undefined;
      const order =
        (typeof payload.orderNumber === "string" && payload.orderNumber) ||
        (typeof nestedOrder === "string" && nestedOrder) ||
        null;
      if (order) {
        setRecharges((prev) =>
          prev.map((r) => (r.id === rechargeId ? { ...r, orderNumber: String(order) } : r))
        );
      }
      await loadRecharges();
    } finally {
      setPaymentLoading(null);
    }
  };

  const requestCreditCheck = async (rechargeId: string) => {
    setCreditLoading(rechargeId);
    setCreditAlertText(null);
    try {
      const res = await fetch(`/api/student/${initial.id}/deposits/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rechargeId }),
      });
      const payload = (await res.json()) as Record<string, unknown> & { depositStatus?: string };
      console.log("[client] /api/student/.../deposits/credit — réponse:", payload);
      setCreditAlertText(messageFromCreditResponse(payload));
      const newDepStatus = payload.depositStatus;
      if (
        res.ok &&
        (newDepStatus === "pending" || newDepStatus === "paid" || newDepStatus === "failed")
      ) {
        setRecharges((prev) =>
          prev.map((r) => (r.id === rechargeId ? { ...r, status: newDepStatus } : r))
        );
      }
      await loadRecharges();
    } finally {
      setCreditLoading(null);
    }
  };

  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2 rounded-2xl bg-gray-100/80 p-1.5 ring-1 ring-gray-200/60 dark:bg-gray-800/50 dark:ring-gray-700/60">
        <button
          type="button"
          onClick={() => setActiveTab("informations")}
          className={`${tabBase} ${
            activeTab === "informations"
              ? "bg-gradient-to-r from-primary to-darkprimary text-white shadow-lg shadow-primary/25"
              : "text-gray-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
          }`}
        >
          <Icon icon="solar:user-id-bold-duotone" className="h-5 w-5" />
          Informations
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("depots")}
          className={`${tabBase} ${
            activeTab === "depots"
              ? "bg-gradient-to-r from-primary to-darkprimary text-white shadow-lg shadow-primary/25"
              : "text-gray-600 hover:bg-white/80 dark:text-gray-300 dark:hover:bg-gray-800/80"
          }`}
        >
          <Icon icon="solar:wallet-money-bold-duotone" className="h-5 w-5" />
          Dépôts
        </button>
      </div>

      {activeTab === "informations" ? (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-white to-gray-50/90 p-6 shadow-[0_4px_24px_-4px_rgba(5, 138, 197,0.1),0_2px_8px_rgba(0,0,0,0.04)] ring-1 ring-gray-100/80 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/95 dark:border-gray-700/80">
          <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-primary/5 blur-3xl" />
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <Icon icon="solar:document-text-bold-duotone" className="h-5 w-5" />
            Fiche étudiant
          </h3>
          <div className="relative grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:user-bold-duotone" className="h-4 w-4 text-primary" />
                Nom
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                name="name"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:letter-bold-duotone" className="h-4 w-4 text-primary" />
                Email
              </label>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                name="email"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:id-card-bold-duotone" className="h-4 w-4 text-primary" />
                Matricule
              </label>
              <input
                value={matricule}
                onChange={(e) => setMatricule(e.target.value)}
                className={inputClass}
                name="matricule"
              />
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:diploma-bold-duotone" className="h-4 w-4 text-primary" />
                Diplôme
              </label>
              <input
                value={diplome}
                onChange={(e) => setDiplome(e.target.value)}
                className={inputClass}
                name="diplome"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:round-graph-bold-duotone" className="h-4 w-4 text-primary" />
                Cycle
              </label>
              <select
                value={cycle}
                onChange={(e) => setCycle(e.target.value)}
                className={inputClass}
                name="cycle"
              >
                {!STUDENT_CYCLES.includes(cycle as (typeof STUDENT_CYCLES)[number]) ? (
                  <option value={cycle}>{cycle} (hérité)</option>
                ) : null}
                {STUDENT_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1.5 text-xs font-medium text-gray-500">Compte</label>
              <div className="flex items-center gap-2 rounded-xl border border-dashed border-primary/20 bg-primary/5 px-4 py-3">
                <Icon
                  icon={initial.status === "active" ? "solar:check-circle-bold" : "solar:clock-circle-bold"}
                  className={`h-5 w-5 ${initial.status === "active" ? "text-emerald-600" : "text-amber-600"}`}
                />
                <span className="text-sm font-medium text-midnight_text dark:text-white">
                  {initial.status === "active" ? "Compte créé (actif)" : "Compte non créé (inactif)"}
                </span>
              </div>
            </div>

            <div className="md:col-span-2">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:gallery-bold-duotone" className="h-4 w-4" />
                Photo
              </p>
              <div className="relative h-36 w-36 overflow-hidden rounded-2xl border-4 border-white shadow-xl ring-2 ring-primary/15 dark:border-gray-800">
                <Image
                  src={initial.photo || "/images/blog/blog_2.jpg"}
                  alt={name}
                  fill
                  className="object-cover transition duration-500 hover:scale-105"
                  sizes="144px"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button
                type="button"
                onClick={saveInformations}
                disabled={isSavingInfo}
                className="group/save inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition duration-300 hover:scale-[1.01] hover:shadow-xl disabled:opacity-60 md:w-auto"
              >
                <Icon icon="solar:diskette-bold" className="h-5 w-5 transition group-hover/save:scale-110" />
                {isSavingInfo ? "Enregistrement…" : "Enregistrer les informations"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-gray-200/80 bg-gradient-to-br from-white via-white to-gray-50/90 p-6 shadow-[0_4px_24px_-4px_rgba(5, 138, 197,0.1)] dark:from-gray-900 dark:via-gray-900 dark:to-gray-950/95 dark:border-gray-700/80">
          <h3 className="mb-4 flex flex-wrap items-center gap-2 text-sm font-bold uppercase tracking-wide text-primary">
            <Icon icon="solar:box-minimalistic-bold-duotone" className="h-5 w-5" />
            Recharges
            <span className="rounded-lg bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              {rechargesTotal} total
            </span>
            {rechargesLoading && <span className="text-xs font-normal text-gray-500">Chargement…</span>}
          </h3>
          {paymentAlertText != null && (
            <p className="mb-3 rounded-lg border border-amber-200/80 bg-amber-50/90 px-3 py-2 text-sm text-amber-950 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-50">
              {paymentAlertText}
            </p>
          )}
          {creditAlertText != null && (
            <p className="mb-3 rounded-lg border border-sky-200/80 bg-sky-50/90 px-3 py-2 text-sm text-sky-950 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-50">
              {creditAlertText}
            </p>
          )}

          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="min-w-0 sm:flex-1">
              <label className="mb-1 block text-xs text-gray-500">Filtrer par statut de paiement</label>
              <select
                value={rechargeStatus}
                onChange={(e) => {
                  setRechargeStatus(e.target.value as "all" | "pending" | "paid" | "failed");
                  setRechargesPage(0);
                }}
                className={inputClass}
              >
                <option value="all">Tous</option>
                <option value="pending">En attente</option>
                <option value="paid">Payé</option>
                <option value="failed">Échoué</option>
              </select>
            </div>
            <div className="min-w-0 sm:min-w-[16rem] sm:flex-1">
              <label className="mb-1 block text-xs text-gray-500">
                Rechercher (N° commande, téléphone, montant)
              </label>
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className={inputClass}
                placeholder="Ex. EuTFh…, +243, 10.5"
              />
            </div>
          </div>

          <div className="mb-6 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
            <p className="mb-3 text-xs font-medium text-gray-600 dark:text-gray-300">Nouveau dépôt (statut : en attente)</p>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs text-gray-500">Montant</label>
                <input
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  type="number"
                  min={0}
                  step="0.01"
                  className={inputClass}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Devise</label>
                <select
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value as "USD" | "CDF")}
                  className={inputClass}
                >
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-500">Téléphone (paiement)</label>
                <input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className={inputClass}
                  placeholder="+243…"
                />
              </div>
            </div>
            <button
              type="button"
              onClick={addDeposit}
              disabled={addDepositLoading}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary px-4 py-2.5 text-sm font-semibold text-white shadow-lg"
            >
              <Icon icon="solar:add-circle-bold" className="h-5 w-5" />
              {addDepositLoading ? "Ajout…" : "Ajouter le dépôt"}
            </button>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
            <span>
              Page {rechargesPage + 1} / {totalPages} · {recharges.length} sur cette page
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={rechargesPage <= 0 || rechargesLoading}
                onClick={() => setRechargesPage((p) => Math.max(0, p - 1))}
                className="rounded-lg border border-gray-300 px-3 py-1 font-medium text-midnight_text disabled:opacity-40 dark:border-gray-600 dark:text-white"
              >
                Précédent
              </button>
              <button
                type="button"
                disabled={rechargesPage + 1 >= totalPages || rechargesLoading}
                onClick={() => setRechargesPage((p) => p + 1)}
                className="rounded-lg border border-gray-300 px-3 py-1 font-medium text-midnight_text disabled:opacity-40 dark:border-gray-600 dark:text-white"
              >
                Suivant
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {recharges.length === 0 && !rechargesLoading && (
              <p className="rounded-xl border border-dashed border-gray-300 py-8 text-center text-sm text-gray-500 dark:border-gray-600 dark:text-gray-400">
                Aucune recharge sur cette page. Ajustez le filtre, la recherche ou la pagination.
              </p>
            )}
            {recharges.map((dep) => {
              const canPay = dep.status === "pending" && !dep.orderNumber;
              const canCredit = Boolean(dep.orderNumber) && dep.status === "pending";
              const statusClass =
                dep.status === "paid"
                  ? "text-emerald-600"
                  : dep.status === "failed"
                    ? "text-rose-600"
                    : "text-amber-600";
              return (
                <div
                  key={dep.id}
                  className="group flex flex-col gap-3 rounded-2xl border border-gray-100/90 bg-white/80 px-4 py-4 shadow-md transition hover:shadow-lg dark:border-gray-700/80 dark:bg-gray-800/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon icon="solar:wallet-money-bold" className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 text-sm">
                      <p className="truncate font-mono text-[10px] text-gray-400" title={dep.id}>
                        {dep.id.length > 14 ? `${dep.id.slice(0, 6)}…${dep.id.slice(-6)}` : dep.id}
                      </p>
                      <p className="font-semibold text-midnight_text dark:text-white">
                        {dep.amount} {dep.currency} · {dep.phoneNumber}
                      </p>
                      {dep.createdAt && (
                        <p className="text-[10px] text-gray-500">{new Date(dep.createdAt).toLocaleString()}</p>
                      )}
                      <p className={`text-xs font-medium ${statusClass}`}>Statut : {dep.status}</p>
                      {dep.orderNumber ? (
                        <p className="mt-1 text-xs text-gray-500">
                          N° commande :{" "}
                          <span className="font-mono font-semibold text-midnight_text dark:text-white">
                            {dep.orderNumber}
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1 text-xs text-gray-500">Aucun numéro de commande (générer le paiement)</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                    {canPay && (
                      <button
                        type="button"
                        onClick={() => requestInitPayment(dep.id)}
                        disabled={paymentLoading === dep.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] disabled:opacity-60"
                      >
                        <Icon icon="solar:card-send-bold" className="h-5 w-5" />
                        {paymentLoading === dep.id ? "Paiement…" : "Générer le paiement (mobile money)"}
                      </button>
                    )}
                    {canCredit && (
                      <button
                        type="button"
                        onClick={() => requestCreditCheck(dep.id)}
                        disabled={creditLoading === dep.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-sky-800 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:scale-[1.02] disabled:opacity-60"
                      >
                        <Icon icon="solar:refresh-bold" className="h-5 w-5" />
                        {creditLoading === dep.id ? "Vérification…" : "Créditer (check statut)"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
