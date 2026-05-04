"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";
import { uploadResolutionFiles } from "@/actions/studentResolutions";
import type { ResolutionResumeFromPaidOrder } from "@/lib/commande/resolutionResumeTypes";

type CommandeView = {
  id: string;
  status: "pending" | "paid" | "failed" | "completed";
  transaction: { amount: number; currency: "USD" | "CDF"; phoneNumber: string; orderNumber?: string };
};

function normalizeCommande(raw: unknown): CommandeView | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  const t = (o.transaction ?? {}) as Record<string, unknown>;
  const id = String(o.id ?? o._id ?? "").trim();
  if (!id) return null;
  return {
    id,
    status:
      String(o.status ?? "").trim() === "paid"
        ? "paid"
        : String(o.status ?? "").trim() === "failed"
          ? "failed"
          : String(o.status ?? "").trim() === "completed"
            ? "completed"
            : "pending",
    transaction: {
      amount: Number(t.amount ?? 0),
      currency: String(t.currency ?? "USD").toUpperCase() === "CDF" ? "CDF" : "USD",
      phoneNumber: String(t.phoneNumber ?? "").trim(),
      orderNumber: String(t.orderNumber ?? "").trim() || undefined,
    },
  };
}

export default function TpResolutionClient({
  activiteIdRaw,
  resumeFromPaidOrder,
  embedded = false,
}: {
  activiteIdRaw: string;
  resumeFromPaidOrder?: ResolutionResumeFromPaidOrder;
  embedded?: boolean;
}) {
  const activiteId = useMemo(() => normalizeMongoObjectIdString(activiteIdRaw), [activiteIdRaw]);
  const [busy, setBusy] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(Boolean(resumeFromPaidOrder));
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matricule, setMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [reponse, setReponse] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [amount, setAmount] = useState("1");
  const [currency, setCurrency] = useState<"USD" | "CDF">("USD");
  const [commande, setCommande] = useState<CommandeView | null>(null);
  const [finalNote, setFinalNote] = useState<number | null>(null);
  const [isCompletedLocked, setIsCompletedLocked] = useState(false);

  async function ensureCommande(nextMatricule?: string, nextEmail?: string) {
    if (!activiteId) return;
    const res = await fetch("/api/resolutions/commande", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "ensure",
        matricule: (nextMatricule ?? matricule).trim(),
        email: (nextEmail ?? email).trim(),
        categorie: "TP",
        reference: activiteId,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      exists?: boolean;
      commande?: CommandeView | null;
      note?: number | null;
    };
    if (!res.ok || body.success === false) throw new Error(body.message ?? "Vérification commande impossible.");
    if (body.exists && body.commande) {
      setCommande(body.commande);
      if (body.commande.status === "completed") {
        setFinalNote(typeof body.note === "number" ? body.note : null);
        setIsCompletedLocked(true);
        setStep(3);
      } else {
        setIsCompletedLocked(false);
        setStep(2);
      }
    } else {
      setCommande(null);
      setIsCompletedLocked(false);
      setStep(1);
    }
  }

  useEffect(() => {
    if (!resumeFromPaidOrder) {
      setResumeLoading(false);
      return;
    }
    const { commandeId, email: em, matricule: mat } = resumeFromPaidOrder;
    if (!String(commandeId).trim()) {
      setResumeLoading(false);
      return;
    }
    let mounted = true;
    void (async () => {
      setResumeLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/resolutions/commande", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "getById", commandeId }),
        });
        const payload = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          commande?: unknown;
          message?: string;
        };
        if (!mounted) return;
        if (!res.ok || payload.success === false) {
          throw new Error(payload.message ?? "Commande introuvable.");
        }
        const cmd = normalizeCommande(payload.commande);
        if (!cmd) throw new Error("Réponse commande invalide.");
        setMatricule(mat.trim());
        setEmail(em.trim());
        setPhoneNumber(cmd.transaction.phoneNumber ?? "");
        setAmount(String(Math.max(1, cmd.transaction.amount || 1)));
        setCurrency(cmd.transaction.currency);
        setCommande(cmd);
        if (cmd.status === "completed") {
          setIsCompletedLocked(true);
          setStep(3);
          if (activiteId) {
            const ens = await fetch("/api/resolutions/commande", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                action: "ensure",
                matricule: mat.trim(),
                email: em.trim(),
                categorie: "TP",
                reference: activiteId,
              }),
            });
            const eb = (await ens.json().catch(() => ({}))) as { note?: number | null };
            if (mounted && typeof eb.note === "number") setFinalNote(eb.note);
          }
        } else if (cmd.status === "paid") {
          setIsCompletedLocked(false);
          setStep(3);
        } else {
          setIsCompletedLocked(false);
          setStep(2);
        }
      } catch (e) {
        if (mounted) setError((e as Error).message ?? "Erreur.");
      } finally {
        if (mounted) setResumeLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [resumeFromPaidOrder, activiteId]);

  async function onStartPayment() {
    setError(null);
    setMessage(null);
    try {
      if (!activiteId) {
        setError("Référence activité manquante.");
        return;
      }
      if (!phoneNumber.trim()) {
        setError("Veuillez renseigner le numéro de téléphone.");
        return;
      }
      const res = await fetch("/api/resolutions/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "pay",
          commandeId: commande?.id,
          matricule: matricule.trim(),
          email: email.trim(),
          categorie: "TP",
          reference: activiteId,
          amount: Number(amount || 0),
          currency,
          phoneNumber: phoneNumber.trim(),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        message?: string;
        commande?: CommandeView;
        data?: CommandeView;
      };
      const nextCommande = normalizeCommande(body.commande ?? body.data ?? null);
      if (!res.ok || body.success === false || !nextCommande) {
        setError(body.message ?? "Paiement refusé.");
        return;
      }
      setCommande(nextCommande);
      if (body.message) setMessage(body.message);
      if (nextCommande.status === "completed") {
        setIsCompletedLocked(true);
        setStep(3);
      } else if (nextCommande.status === "paid") {
        setStep(3);
      } else {
        setStep(2);
      }
    } catch (e) {
      setError((e as Error).message ?? "Erreur lors du paiement.");
    }
  }

  async function onCheckPayment() {
    if (!commande) return;
    const res = await fetch("/api/resolutions/commande", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "check",
        commandeId: commande.id,
        matricule: matricule.trim(),
        email: email.trim(),
        categorie: "TP",
        reference: activiteId,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; commande?: unknown };
    const nextCommande = normalizeCommande(body.commande);
    if (!res.ok || body.success === false || !nextCommande) throw new Error(body.message ?? "Check impossible.");
    setCommande(nextCommande);
    if (nextCommande.status === "paid") {
      setIsCompletedLocked(false);
      setStep(3);
    }
    if (nextCommande.status === "completed") {
      setIsCompletedLocked(true);
      setStep(3);
    }
  }

  async function onResetFailed() {
    if (!commande) return;
    const res = await fetch("/api/resolutions/commande", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset", commandeId: commande.id }),
    });
    const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
    if (!res.ok || body.success === false) throw new Error(body.message ?? "Reset impossible.");
    setCommande(null);
    setIsCompletedLocked(false);
    setStep(1);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activiteId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (!commande || commande.status !== "paid") throw new Error("Paiement non validé.");
      const orderNumber = String(commande.transaction.orderNumber ?? "").trim();
      if (!orderNumber) throw new Error("orderNumber introuvable sur la commande.");
      const filePayload = await uploadResolutionFiles({
        files,
        matricule: matricule.trim(),
        activiteId,
      });
      const payload = {
        email: email.trim(),
        matricule: matricule.trim(),
        matiere: commande.id,
        note: 0,
        activite_id: activiteId,
        reponses_qcm: [],
        reponses_tp: [
          {
            tp_id: orderNumber,
            reponse: reponse.trim(),
            fichiers: filePayload,
          },
        ],
      };
      const res = await fetch("/api/resolutions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || body.success === false) throw new Error(body.message ?? "Soumission refusée.");
      await fetch("/api/resolutions/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", commandeId: commande.id }),
      });
      setMessage("Résolution TP soumise avec succès.");
      setIsCompletedLocked(true);
      setStep(3);
    } catch (err) {
      setError((err as Error).message ?? "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-2xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      {embedded ? (
        <h2 className="text-lg font-semibold text-midnight_text dark:text-white">Soumission TP</h2>
      ) : (
        <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Soumission TP</h1>
      )}
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
        Joignez votre fichier puis soumettez votre résolution.
      </p>
      <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Activité : <strong>{activiteId ?? "Introuvable"}</strong>
      </p>

      {resumeLoading ? <p className="mt-3 text-sm text-gray-500">Chargement de la commande…</p> : null}
      {message ? <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <form className="mt-4 space-y-3" onSubmit={onSubmit}>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Matricule</label>
            <input
              required
              value={matricule}
              onChange={(e) => setMatricule(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </div>
        {step === 1 && !resumeFromPaidOrder ? (
          <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600">Étape 1 : vérifier/initialiser la commande</p>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Téléphone mobile money</label>
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Montant</label>
                <input
                  type="number"
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value === "CDF" ? "CDF" : "USD")}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                >
                  <option value="USD">USD</option>
                  <option value="CDF">CDF</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void ensureCommande()}
                className="rounded-md border border-primary px-3 py-2 text-xs font-semibold text-primary"
              >
                Vérifier commande existante
              </button>
              <button
                type="button"
                onClick={() => void onStartPayment()}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white"
              >
                Payer maintenant
              </button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-3 rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-xs font-semibold text-gray-600">Étape 2 : vérifier le paiement</p>
            <p className="text-xs text-gray-500">Statut commande : {commande?.status ?? "—"}</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void onCheckPayment()}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-white"
              >
                Vérifier le paiement
              </button>
              {commande?.status === "failed" ? (
                <button
                  type="button"
                  onClick={() => void onResetFailed()}
                  className="rounded-md border border-red-300 px-3 py-2 text-xs font-semibold text-red-600"
                >
                  Refaire un paiement
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
        {isCompletedLocked ? (
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Résolution déjà soumise. {finalNote != null ? <>Note obtenue : <strong>{finalNote}</strong></> : "Commande terminée."}
          </div>
        ) : null}
        {step !== 3 || isCompletedLocked ? null : (
          <>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Réponse textuelle</label>
          <textarea
            value={reponse}
            onChange={(e) => setReponse(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400">Fichier(s) TP</label>
          <input
            type="file"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
          <p className="mt-1 text-xs text-gray-500">{files.length} fichier(s) sélectionné(s)</p>
        </div>
        <button
          type="submit"
          disabled={busy || !activiteId || resumeLoading || commande?.status !== "paid"}
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-primary dark:text-gray-900"
        >
          {busy ? "Soumission..." : "Soumettre ma résolution TP"}
        </button>
          </>
        )}
      </form>
    </section>
  );
}
