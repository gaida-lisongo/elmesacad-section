"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import { buildResolutionResume } from "@/app/paiement/_components/commandeResumePayload";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";

type QcmQuestion = {
  id: string;
  enonce: string;
  options: string[];
};

type ActivityData = {
  id: string;
  montant: number;
  currency: "USD" | "CDF";
  matiere: string;
  qcm: QcmQuestion[];
};

type CommandeView = {
  id: string;
  status: "pending" | "paid" | "failed" | "completed";
  transaction: { amount: number; currency: "USD" | "CDF"; phoneNumber: string; orderNumber?: string };
};

function commandeViewFromPayload(commandeId: string, payload: PaiementCommandeClientPayload): CommandeView | null {
  const s = String(payload.status ?? "").trim();
  const status: CommandeView["status"] =
    s === "paid" ? "paid" : s === "failed" ? "failed" : s === "completed" ? "completed" : "pending";
  const tx = payload.transaction ?? {};
  return {
    id: commandeId,
    status,
    transaction: {
      amount: Number(tx.amount ?? 0),
      currency: String(tx.currency ?? "USD").toUpperCase() === "CDF" ? "CDF" : "USD",
      phoneNumber: String(tx.phoneNumber ?? "").trim(),
      orderNumber: tx.orderNumber != null ? String(tx.orderNumber).trim() || undefined : undefined,
    },
  };
}

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
};

export default function PaiementMetierQcmPanel({ commande, commandeId }: Props) {
  const ref = String(commande.ressource?.reference ?? "").trim();
  const studentEmail = String(commande.student?.email ?? "").trim();
  const studentMatricule = String(commande.student?.matricule ?? "").trim();
  const resume = useMemo(
    () => buildResolutionResume(commandeId, commande),
    [commandeId, studentEmail, studentMatricule]
  );
  const activiteId = useMemo(() => normalizeMongoObjectIdString(ref), [ref]);

  const cmd = useMemo(
    () => commandeViewFromPayload(commandeId, commande),
    [
      commandeId,
      commande.status,
      commande.transaction?.orderNumber,
      commande.transaction?.amount,
      commande.transaction?.currency,
      commande.transaction?.phoneNumber,
    ]
  );

  const [activity, setActivity] = useState<ActivityData | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [qIndex, setQIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [finalNote, setFinalNote] = useState<number | null>(null);
  const [noteLoading, setNoteLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const matricule = resume ? resume.matricule : "";
  const email = resume ? resume.email : "";

  const isCompleted = cmd?.status === "completed";
  const isPaid = cmd?.status === "paid";
  const workflowDone = isCompleted || submitted;
  const canSubmit = isPaid && !workflowDone;

  const cmdStatus = cmd?.status;

  const fetchNoteIfCompleted = useCallback(async () => {
    if (!activiteId || !studentEmail || !studentMatricule || (cmdStatus !== "completed" && !submitted)) return;
    setNoteLoading(true);
    try {
      const res = await fetch("/api/resolutions/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "ensure",
          matricule: studentMatricule,
          email: studentEmail,
          categorie: "QCM",
          reference: activiteId,
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { note?: number | null };
      if (typeof body.note === "number") setFinalNote(body.note);
    } finally {
      setNoteLoading(false);
    }
  }, [activiteId, studentEmail, studentMatricule, cmdStatus, submitted]);

  useEffect(() => {
    if (!activiteId || !studentEmail || !studentMatricule) return;
    let mounted = true;
    (async () => {
      setLoadingActivity(true);
      setError(null);
      try {
        const res = await fetch(`/api/activites/${encodeURIComponent(activiteId)}`, { cache: "no-store" });
        const payload = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          message?: string;
          data?: Record<string, unknown>;
        };
        if (!mounted) return;
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
        setActivity({
          id: String(raw._id ?? raw.id ?? activiteId),
          montant: Number(raw.montant ?? 0),
          currency: String(raw.currency ?? "USD").toUpperCase() === "CDF" ? "CDF" : "USD",
          matiere: String(raw.matiere ?? "").trim(),
          qcm,
        });
      } catch (e) {
        if (mounted) setError((e as Error).message ?? "Erreur inattendue.");
      } finally {
        if (mounted) setLoadingActivity(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [activiteId, studentEmail, studentMatricule]);

  useEffect(() => {
    setQIndex(0);
  }, [activiteId]);

  useEffect(() => {
    void fetchNoteIfCompleted();
  }, [fetchNoteIfCompleted]);

  async function onSubmit() {
    if (!activiteId || !activity || !cmd || !resume) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const reponses_qcm = activity.qcm.map((q) => ({
        qcm_id: q.id,
        reponse: String(answers[q.id] ?? "").trim(),
      }));
      if (reponses_qcm.some((x) => !x.reponse)) {
        throw new Error("Répondez à toutes les questions avant de soumettre.");
      }
      if (cmd.status !== "paid") throw new Error("Paiement non validé.");
      const orderNumber = String(cmd.transaction.orderNumber ?? "").trim();
      if (!orderNumber) throw new Error("Référence de paiement introuvable sur la commande.");
      const payload = {
        email: resume.email.trim(),
        matricule: resume.matricule.trim(),
        matiere: cmd.id,
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
      await fetch("/api/resolutions/commande", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete", commandeId: cmd.id }),
      });
      setMessage("Résolution QCM soumise avec succès.");
      setSubmitted(true);
    } catch (err) {
      setError((err as Error).message ?? "Erreur inattendue.");
    } finally {
      setBusy(false);
    }
  }

  if (!ref || !resume || !cmd) {
    return (
      <p className="text-sm text-amber-800 dark:text-amber-200">
        Données insuffisantes pour afficher le QCM (référence ou identité étudiant).
      </p>
    );
  }

  const questions = activity?.qcm ?? [];
  const total = questions.length;
  const current = questions[qIndex];
  const answeredCount = questions.filter((q) => String(answers[q.id] ?? "").trim()).length;
  const currentAnswered = current ? Boolean(String(answers[current.id] ?? "").trim()) : false;
  const allAnswered = total > 0 && answeredCount === total;

  return (
    <div className="w-full min-w-0 max-w-none">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:bg-primary/15">
            <Icon icon="solar:clipboard-list-bold" className="text-2xl" aria-hidden />
          </span>
          <div>
            <h3 className="text-lg font-bold text-midnight_text dark:text-white">Questionnaire (QCM)</h3>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
              Une question à la fois — parcours optimisé après paiement validé.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800">
            <Icon icon="solar:user-id-bold" className="text-base text-primary" aria-hidden />
            {matricule}
          </span>
          <span className="inline-flex max-w-[16rem] truncate rounded-full bg-slate-100 px-3 py-1 dark:bg-slate-800" title={email}>
            <Icon icon="solar:letter-bold" className="mr-1 shrink-0 text-base text-primary" aria-hidden />
            {email}
          </span>
        </div>
      </div>

      {loadingActivity ? (
        <p className="mt-6 flex items-center gap-3 text-sm text-slate-500">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200/80 dark:bg-slate-800">
            <Icon icon="svg-spinners:3-dots-fade" className="text-2xl" aria-hidden />
          </span>
          Chargement du questionnaire…
        </p>
      ) : null}

      {message && !workflowDone ? (
        <p className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15">
            <Icon icon="solar:check-circle-bold" className="text-xl text-emerald-600 dark:text-primary" aria-hidden />
          </span>
          <span className="pt-0.5">{message}</span>
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/15">
            <Icon icon="solar:danger-circle-bold" className="text-xl text-red-600 dark:text-red-400" aria-hidden />
          </span>
          <span className="pt-0.5">{error}</span>
        </p>
      ) : null}

      {workflowDone || message ? (
        <div className="mt-6 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 to-white p-6 shadow-sm dark:border-emerald-900/50 dark:from-emerald-950/25 dark:to-darklight">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-emerald-700 dark:text-emerald-300">
              <Icon icon="solar:diploma-bold" className="text-2xl" aria-hidden />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800 dark:text-emerald-200">Résolution enregistrée</p>
              {message ? (
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">{message}</p>
              ) : null}
              <p className={`mt-1 text-sm text-slate-700 dark:text-slate-200 ${message ? "mt-2" : "mt-1"}`}>
                {noteLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Icon icon="svg-spinners:3-dots-fade" className="text-lg" aria-hidden />
                    Récupération de la note…
                  </span>
                ) : finalNote != null ? (
                  <>
                    Note obtenue : <strong className="text-midnight_text dark:text-white">{finalNote}</strong>
                  </>
                ) : !message ? (
                  "Votre copie a bien été prise en compte."
                ) : (
                  <span className="text-slate-500 dark:text-slate-400">
                    La note apparaîtra dès qu&apos;elle sera publiée.
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {activity && total === 0 ? (
        <p className="mt-6 text-sm text-amber-800 dark:text-amber-200">Cette activité ne contient aucune question QCM.</p>
      ) : null}

      {canSubmit && activity && total > 0 && current ? (
        <div className="mt-6 space-y-5">
          {activity.matiere ? (
            <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 dark:border-slate-600 dark:bg-slate-800/50">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon icon="solar:square-academic-cap-bold" className="text-xl" aria-hidden />
              </span>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">{activity.matiere}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-darklight">
            <span className="flex items-center gap-2.5 text-sm font-medium text-slate-600 dark:text-slate-300">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <Icon icon="solar:chart-2-bold" className="text-lg" aria-hidden />
              </span>
              <span>
                Question{" "}
                <strong className="text-midnight_text dark:text-white">
                  {qIndex + 1}
                </strong>{" "}
                / {total}
              </span>
            </span>
            <div className="hidden h-2 min-w-[4rem] flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 sm:block" aria-hidden>
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${((qIndex + 1) / total) * 100}%` }}
              />
            </div>
            <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Icon icon="solar:checklist-minimalistic-bold" className="text-lg text-primary" aria-hidden />
              {answeredCount}/{total} répondues
            </span>
          </div>

          <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-darklight">
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50 md:px-7">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-400">
                <Icon icon="solar:document-text-bold" className="text-xl" aria-hidden />
              </span>
              <h4 className="text-sm font-bold text-midnight_text dark:text-white">Énoncé</h4>
            </div>
            <div className="p-5 md:p-7">
              <p className="text-base leading-relaxed text-midnight_text dark:text-white md:text-lg">{current.enonce}</p>
              <div className="mt-6 flex items-center gap-2 border-b border-slate-100 pb-2 dark:border-slate-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon icon="solar:list-check-bold" className="text-lg" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Choix de réponse</span>
              </div>
              <ul className="mt-4 space-y-2.5">
              {current.options.map((opt, i) => {
                const selected = answers[current.id] === opt;
                return (
                  <li key={`${current.id}-opt-${i}`}>
                    <button
                      type="button"
                      onClick={() => setAnswers((prev) => ({ ...prev, [current.id]: opt }))}
                      className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3.5 text-left text-sm transition-all md:text-base ${
                        selected
                          ? "border-primary bg-primary/10 dark:bg-primary/15"
                          : "border-slate-200 hover:border-primary/40 hover:bg-slate-50 dark:border-slate-600 dark:hover:bg-slate-800/80"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                          selected ? "bg-primary text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        }`}
                      >
                        <Icon icon={selected ? "solar:check-circle-bold" : "solar:circle-linear"} className="text-xl" aria-hidden />
                      </span>
                      <span className="pt-1 leading-snug text-midnight_text dark:text-slate-100">{opt}</span>
                    </button>
                  </li>
                );
              })}
              </ul>
            </div>
          </article>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={() => setQIndex((i) => Math.max(0, i - 1))}
              disabled={qIndex === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-midnight_text shadow-sm transition hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-40 dark:border-slate-600 dark:bg-darklight dark:text-white dark:hover:bg-slate-800"
              aria-label="Question précédente"
            >
              <Icon icon="solar:arrow-left-linear" className="text-xl" aria-hidden />
              Précédent
            </button>

            {qIndex < total - 1 ? (
              <button
                type="button"
                onClick={() => currentAnswered && setQIndex((i) => Math.min(total - 1, i + 1))}
                disabled={!currentAnswered}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                aria-label="Question suivante"
              >
                Suivant
                <Icon icon="solar:arrow-right-linear" className="text-xl" aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void onSubmit()}
                disabled={busy || !allAnswered || loadingActivity}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-700/30 bg-red-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:pointer-events-none disabled:opacity-40 dark:border-red-500/40 dark:bg-red-600 dark:hover:bg-red-500"
                aria-label="Soumettre le QCM"
              >
                {busy ? (
                  <Icon icon="svg-spinners:3-dots-fade" className="text-2xl" aria-hidden />
                ) : (
                  <Icon icon="solar:shield-check-bold" className="text-xl" aria-hidden />
                )}
                {busy ? "Envoi…" : "Soumettre ma résolution"}
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
