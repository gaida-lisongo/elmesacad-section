"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import PaiementCommandeVerification from "./_components/PaiementCommandeVerification";
import PaiementCommandeMetier from "./_components/PaiementCommandeMetier";
import type { PaiementCommandeClientPayload } from "./_components/commandeResumePayload";

type Props = {
  commandeId: string;
};

async function postCommande(body: Record<string, unknown>) {
  const res = await fetch("/api/resolutions/commande", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, payload };
}

export default function PaiementResumeClient({ commandeId }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<PaiementCommandeClientPayload | null>(null);

  const load = useCallback(async () => {
    if (!commandeId) return;
    setBusy(true);
    setError(null);
    try {
      const { ok, payload } = await postCommande({ action: "getById", commandeId });
      if (!ok || payload.success === false) {
        throw new Error(String(payload.message ?? "Commande introuvable."));
      }
      setData(payload.commande as PaiementCommandeClientPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
      setData(null);
    } finally {
      setBusy(false);
    }
  }, [commandeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const check = async () => {
    setBusy(true);
    setError(null);
    try {
      const { ok, payload } = await postCommande({ action: "check", commandeId });
      if (!ok || payload.success === false) {
        throw new Error(String(payload.message ?? "Vérification impossible."));
      }
      setData(payload.commande as PaiementCommandeClientPayload);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  };

  const status = String(data?.status ?? "—");
  const tx = data?.transaction ?? {};
  const orderNumber = tx.orderNumber != null ? String(tx.orderNumber) : undefined;
  const showVerification = Boolean(data) && (status === "pending" || status === "failed");
  const showMetier = Boolean(data) && (status === "paid" || status === "completed");

  return (
    <div
      className={`w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14 ${showMetier ? "max-w-none" : "mx-auto max-w-lg"}`}
    >
      <Link
        href="/etudes"
        className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
      >
        <Icon icon="solar:arrow-left-linear" className="text-lg" />
        Retour aux études
      </Link>
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-300">
        Identifiant : <span className="font-mono text-xs">{commandeId}</span>
      </p>

      {error ? (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </p>
      ) : null}

      {data ? (
        <>
          {showVerification ? (
            <div className="mt-6">
              <PaiementCommandeVerification
                status={status}
                orderNumber={orderNumber}
                busy={busy}
                onSync={() => void check()}
              />
            </div>
          ) : null}
          {showMetier ? (
            <PaiementCommandeMetier
              commande={data}
              commandeId={commandeId}
              busy={busy}
              onRecheck={() => void check()}
            />
          ) : null}
          {!showVerification && !showMetier ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm dark:border-slate-700 dark:bg-darklight dark:text-slate-300">
              Statut : <span className="font-semibold text-midnight_text dark:text-white">{status}</span>
              <p className="mt-2 text-xs text-slate-500">
                État non géré sur cette page — contactez le support si le problème persiste.
              </p>
            </div>
          ) : null}
        </>
      ) : !error && busy ? (
        <p className="mt-6 text-sm text-slate-500">Chargement…</p>
      ) : null}
    </div>
  );
}
