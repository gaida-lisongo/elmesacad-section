"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { PaiementCommandeClientPayload } from "@/app/paiement/_components/commandeResumePayload";
import { buildResolutionResume } from "@/app/paiement/_components/commandeResumePayload";
import { normalizeMongoObjectIdString } from "@/lib/mongo/normalizeObjectId";
import { uploadResolutionFiles } from "@/actions/studentResolutions";

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

function pickActiviteConsigne(raw: Record<string, unknown>): string {
  const candidates = [
    raw.consigne,
    raw.instructions,
    raw.enonce,
    raw.sujet,
    raw.description,
    raw.intitule,
    raw.matiere,
  ];
  for (const c of candidates) {
    const t = String(c ?? "").trim();
    if (t) return t;
  }
  return "";
}

type Props = {
  commande: PaiementCommandeClientPayload;
  commandeId: string;
};

export default function PaiementMetierTpPanel({ commande, commandeId }: Props) {
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

  const [consigne, setConsigne] = useState("");
  const [matiereLabel, setMatiereLabel] = useState("");
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [reponse, setReponse] = useState("");
  const [files, setFiles] = useState<File[]>([]);
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
          categorie: "TP",
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
          throw new Error(payload.message ?? "Impossible de charger l'activité TP.");
        }
        const raw = payload.data;
        setConsigne(pickActiviteConsigne(raw));
        setMatiereLabel(String(raw.matiere ?? "").trim());
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
    void fetchNoteIfCompleted();
  }, [fetchNoteIfCompleted]);

  function onPickFiles(list: FileList | null) {
    setFiles(Array.from(list ?? []));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!activiteId || !cmd || !resume) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      if (cmd.status !== "paid") throw new Error("Paiement non validé.");
      const orderNumber = String(cmd.transaction.orderNumber ?? "").trim();
      if (!orderNumber) throw new Error("Référence de paiement introuvable sur la commande.");
      const filePayload = await uploadResolutionFiles({
        files,
        matricule: resume.matricule.trim(),
        activiteId,
      });
      const payload = {
        email: resume.email.trim(),
        matricule: resume.matricule.trim(),
        matiere: cmd.id,
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
        body: JSON.stringify({ action: "complete", commandeId: cmd.id }),
      });
      setMessage("Résolution TP soumise avec succès.");
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
        Données insuffisantes pour afficher le TP (référence ou identité étudiant).
      </p>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-none">
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 dark:border-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-bold text-midnight_text dark:text-white">Travaux pratiques (TP)</h3>
          <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">
            Consigne lisible en pleine largeur, pièces jointes et rédaction après paiement validé.
          </p>
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
        <p className="mt-6 flex items-center gap-2 text-sm text-slate-500">
          <Icon icon="svg-spinners:3-dots-fade" className="text-xl" aria-hidden />
          Chargement de l&apos;énoncé…
        </p>
      ) : null}

      {message && !workflowDone ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100">
          <Icon icon="solar:check-circle-bold" className="mt-0.5 shrink-0 text-lg text-emerald-600 dark:text-primary" aria-hidden />
          {message}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
          <Icon icon="solar:danger-circle-bold" className="mt-0.5 shrink-0 text-lg" aria-hidden />
          {error}
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
              <p className={`text-sm text-slate-700 dark:text-slate-200 ${message ? "mt-2" : "mt-1"}`}>
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
                  "Votre dépôt a bien été pris en compte."
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

      {canSubmit ? (
        <form className="mt-6 space-y-6" onSubmit={(ev) => void onSubmit(ev)}>
          {matiereLabel ? (
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{matiereLabel}</p>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight md:p-7">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3 dark:border-slate-700">
              <Icon icon="solar:document-text-bold" className="text-2xl text-primary" aria-hidden />
              <h4 className="text-sm font-bold text-midnight_text dark:text-white">Consigne</h4>
            </div>
            <div className="prose prose-slate dark:prose-invert mt-4 max-w-none">
              {consigne ? (
                <p className="whitespace-pre-wrap text-base leading-relaxed text-midnight_text dark:text-slate-100 md:text-lg">
                  {consigne}
                </p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Aucun texte de consigne fourni pour cette activité. Suivez les indications du titulaire ou du support.
                </p>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight md:p-7">
            <label className="flex items-center gap-2 text-sm font-semibold text-midnight_text dark:text-white">
              <Icon icon="solar:pen-new-square-bold" className="text-xl text-primary" aria-hidden />
              Votre réponse rédigée
            </label>
            <textarea
              value={reponse}
              onChange={(e) => setReponse(e.target.value)}
              rows={8}
              className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-3 text-base leading-relaxed text-midnight_text shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-slate-600 dark:bg-slate-900/40 dark:text-white"
              placeholder="Rédigez votre analyse, vos calculs ou la marche à suivre de votre TP…"
            />
          </section>

          <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-5 dark:border-slate-600 dark:bg-slate-900/30 md:p-7">
            <label className="flex items-center gap-2 text-sm font-semibold text-midnight_text dark:text-white">
              <Icon icon="solar:folder-with-files-bold" className="text-xl text-primary" aria-hidden />
              Pièces jointes
            </label>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">PDF, images ou archives selon les consignes du cours.</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-midnight_text shadow-sm transition hover:bg-slate-50 dark:border-slate-600 dark:bg-darklight dark:text-white dark:hover:bg-slate-800">
                <Icon icon="solar:add-folder-bold" className="text-xl text-primary" aria-hidden />
                Ajouter des fichiers
                <input type="file" className="sr-only" multiple onChange={(e) => onPickFiles(e.target.files)} />
              </label>
              {files.length > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary">
                  <Icon icon="solar:paperclip-bold" aria-hidden />
                  {files.length} fichier(s)
                </span>
              ) : null}
            </div>
            {files.length > 0 ? (
              <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-300">
                {files.map((f) => (
                  <li key={f.name + f.size} className="truncate">
                    {f.name}
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          <button
            type="submit"
            disabled={busy || loadingActivity}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-4 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40 dark:bg-primary dark:text-gray-900"
            aria-label="Soumettre le TP"
          >
            {busy ? (
              <Icon icon="svg-spinners:3-dots-fade" className="text-2xl" aria-hidden />
            ) : (
              <Icon icon="solar:upload-minimalistic-bold" className="text-xl" aria-hidden />
            )}
            {busy ? "Envoi en cours…" : "Soumettre ma résolution TP"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
