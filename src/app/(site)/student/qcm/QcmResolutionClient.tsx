"use client";

import { useEffect, useMemo, useState } from "react";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";

type QcmQuestion = {
  id: string;
  enonce: string;
  options: string[];
};

type ActivityData = {
  id: string;
  matiere: string;
  qcm: QcmQuestion[];
};

export default function QcmResolutionClient({ activiteIdRaw }: { activiteIdRaw: string }) {
  const activiteId = useMemo(() => normalizeMongoObjectIdString(activiteIdRaw), [activiteIdRaw]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [matricule, setMatricule] = useState("");
  const [email, setEmail] = useState("");
  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    let mounted = true;
    async function run() {
      if (!activiteId) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/activites/${encodeURIComponent(activiteId)}`, { cache: "no-store" });
        const payload = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          data?: Record<string, unknown>;
        };
        if (!res.ok || payload.success === false || !payload.data) {
          throw new Error(payload.message ?? "Impossible de charger l'activité QCM.");
        }
        const raw = payload.data;
        const qcmRaw = Array.isArray(raw.qcm) ? raw.qcm : [];
        const qcm: QcmQuestion[] = qcmRaw.map((q, idx) => {
          const o = (q ?? {}) as Record<string, unknown>;
          const rid = String(o._id ?? o.id ?? `qcm-${idx + 1}`).trim();
          return {
            id: rid,
            enonce: String(o.enonce ?? "").trim() || `Question ${idx + 1}`,
            options: Array.isArray(o.options) ? o.options.map((x) => String(x ?? "").trim()).filter(Boolean) : [],
          };
        });
        if (!mounted) return;
        setActivity({
          id: String(raw._id ?? raw.id ?? activiteId),
          matiere: String(raw.matiere ?? "").trim(),
          qcm,
        });
      } catch (e) {
        if (!mounted) return;
        setError((e as Error).message ?? "Erreur inattendue.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void run();
    return () => {
      mounted = false;
    };
  }, [activiteId]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!activiteId || !activity) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const reponses_qcm = activity.qcm.map((q) => ({
        qcm_id: q.id,
        reponse: String(answers[q.id] ?? "").trim(),
      }));
      if (reponses_qcm.some((x) => !x.reponse)) {
        throw new Error("Veuillez répondre à toutes les questions.");
      }
      const payload = {
        email: email.trim(),
        matricule: matricule.trim(),
        matiere: activity.matiere,
        note: 0,
        activite_id: activiteId,
        reponses_qcm,
        reponses_tp: [],
      };
      const res = await fetch("/api/resolutions/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string };
      if (!res.ok || body.success === false) throw new Error(body.message ?? "Soumission refusée.");
      setMessage("Résolution QCM soumise avec succès.");
    } catch (err) {
      setError((err as Error).message ?? "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <h1 className="text-xl font-semibold text-midnight_text dark:text-white">Soumission QCM</h1>
      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Répondez puis soumettez votre résolution.</p>
      <p className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
        Activité : <strong>{activiteId ?? "Introuvable"}</strong>
      </p>

      {loading ? <p className="mt-3 text-sm text-gray-500">Chargement du QCM…</p> : null}
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

        {(activity?.qcm ?? []).map((q, idx) => (
          <div key={q.id} className="rounded-md border border-gray-200 p-3 dark:border-gray-700">
            <p className="text-sm font-semibold text-midnight_text dark:text-white">
              {idx + 1}. {q.enonce}
            </p>
            <div className="mt-2 space-y-1">
              {q.options.map((opt, i) => {
                const radioId = `${q.id}-opt-${i}`;
                return (
                  <label key={radioId} htmlFor={radioId} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      id={radioId}
                      type="radio"
                      name={`qcm-${q.id}`}
                      checked={answers[q.id] === opt}
                      onChange={() => setAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                    />
                    <span>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}

        <button
          type="submit"
          disabled={busy || !activiteId || loading || !activity}
          className="w-full rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-[#5ec998] dark:text-gray-900"
        >
          {busy ? "Soumission..." : "Soumettre ma résolution QCM"}
        </button>
      </form>
    </section>
  );
}
