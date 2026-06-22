"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Breadcrumb from "@/components/Breadcrumb";
import { QRCodeSVG } from "qrcode.react";
import { resolvePublicOrigin } from "@/lib/ticket/buildTicketPublicUrl";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

type FormationDetail = {
  _id: string;
  slug: string;
  titre: string;
  description: string;
  objectifs: string[];
  questionnaire: QuestionPayload[];
  dateFormation: string;
  image: string;
  actif: boolean;
};

type QuestionPayload = {
  question: string;
  propositions: string[];
  bonneReponse: number;
  points: number;
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function FormationDetailPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");

  const [data, setData] = useState<FormationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [objectifs, setObjectifs] = useState<string[]>([""]);
  const [questions, setQuestions] = useState<QuestionPayload[]>([
    { question: "", propositions: ["", ""], bonneReponse: 0, points: 2 },
  ]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/formations/slug/${encodeURIComponent(slug)}`);
      const json = (await res.json()) as { data?: FormationDetail; message?: string };
      if (!res.ok) {
        setError(json.message ?? "Chargement impossible");
        setData(null);
        return;
      }
      if (json.data) {
        setData(json.data);
        setImage(json.data.image);
        setObjectifs(json.data.objectifs?.length ? json.data.objectifs : [""]);
        setQuestions(
          json.data.questionnaire?.length
            ? json.data.questionnaire
            : [{ question: "", propositions: ["", ""], bonneReponse: 0, points: 2 }]
        );
      }
    } catch {
      setError("Réseau");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) load();
  }, [load, slug]);

  const publicUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : resolvePublicOrigin();
    return `${origin}/formations/${slug}`;
  }, [slug]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/formations/upload-image", { method: "POST", body: fd });
      const json = (await res.json()) as { image?: string; message?: string };
      if (!res.ok) {
        setMessage(json.message ?? "Upload impossible");
        return;
      }
      if (json.image) setImage(json.image);
    } catch {
      setMessage("Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const updateObjectif = (i: number, value: string) => {
    setObjectifs(objectifs.map((o, idx) => (idx === i ? value : o)));
  };
  const addObjectif = () => setObjectifs([...objectifs, ""]);
  const removeObjectif = (i: number) => setObjectifs(objectifs.filter((_, idx) => idx !== i));

  const updateQuestion = (i: number, patch: Partial<QuestionPayload>) => {
    setQuestions(questions.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  };
  const updateProposition = (qIdx: number, pIdx: number, value: string) => {
    setQuestions(
      questions.map((q, idx) =>
        idx === qIdx
          ? { ...q, propositions: q.propositions.map((p, pI) => (pI === pIdx ? value : p)) }
          : q
      )
    );
  };
  const addProposition = (qIdx: number) => {
    setQuestions(
      questions.map((q, idx) => (idx === qIdx ? { ...q, propositions: [...q.propositions, ""] } : q))
    );
  };
  const removeProposition = (qIdx: number, pIdx: number) => {
    setQuestions(
      questions.map((q, idx) =>
        idx === qIdx
          ? {
              ...q,
              propositions: q.propositions.filter((_, pI) => pI !== pIdx),
              bonneReponse: q.bonneReponse >= q.propositions.length - 1 ? 0 : q.bonneReponse,
            }
          : q
      )
    );
  };
  const addQuestion = () => {
    setQuestions([...questions, { question: "", propositions: ["", ""], bonneReponse: 0, points: 2 }]);
  };
  const removeQuestion = (i: number) => setQuestions(questions.filter((_, idx) => idx !== i));

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!data) return;
    setSaving(true);
    setMessage(null);

    const fd = new FormData(e.currentTarget);
    const body = {
      titre: String(fd.get("titre") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      dateFormation: String(fd.get("dateFormation") ?? "").trim(),
      image: image.trim(),
      actif: fd.get("actif") === "on",
      objectifs: objectifs.filter((o) => o.trim()),
      questionnaire: questions.filter((q) => q.question.trim()),
    };

    const res = await fetch(`/api/formations/${data._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { data?: FormationDetail; message?: string };
    if (!res.ok) {
      setMessage(json.message ?? "Erreur lors de l'enregistrement");
    } else {
      setMessage("Formation enregistrée.");
      if (json.data) setData(json.data);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-gray-500">Chargement…</p>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <p className="text-sm text-rose-600">{error ?? "Formation introuvable"}</p>
        <Link
          href="/formations"
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Retour aux formations
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4">
        <Breadcrumb
          links={[
            { href: "/formations", text: "Formations" },
            { href: `/formations/${slug}`, text: data.titre || slug },
          ]}
        />
      </div>

      <header className="mb-6">
        <h1 className="text-2xl font-bold text-midnight_text dark:text-white">Modifier la formation</h1>
        <p className="mt-1 text-sm text-body-color">Mettez à jour les informations, l'image et le questionnaire.</p>
      </header>

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Titre *</label>
            <input name="titre" required defaultValue={data.titre} className={inputClass} />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
              Date de formation *
            </label>
            <input
              name="dateFormation"
              type="datetime-local"
              required
              defaultValue={data.dateFormation ? new Date(data.dateFormation).toISOString().slice(0, 16) : ""}
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
              <Icon icon="solar:gallery-round-bold-duotone" className="h-4 w-4 text-primary" />
              Image
            </label>
            <div className="flex flex-wrap items-center gap-3">
              {image && (
                <div className="relative h-20 w-20 overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-600">
                  <Image src={image} alt="Aperçu" fill className="object-cover" sizes="80px" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={onFile} disabled={uploading} className="text-xs" />
              {uploading && <span className="text-xs text-gray-500">Envoi…</span>}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
            <textarea
              name="description"
              rows={4}
              defaultValue={data.description}
              className={inputClass}
              placeholder="Description de la formation…"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              Objectifs
              <button type="button" onClick={addObjectif} className="text-primary hover:underline">
                + Ajouter
              </button>
            </label>
            <div className="space-y-2">
              {objectifs.map((o, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    value={o}
                    onChange={(e) => updateObjectif(i, e.target.value)}
                    className={inputClass}
                    placeholder={`Objectif ${i + 1}`}
                  />
                  {objectifs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeObjectif(i)}
                      className="text-rose-500 hover:text-rose-600"
                    >
                      <Icon icon="solar:trash-bin-minimalistic-bold" className="h-5 w-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 flex items-center justify-between text-xs font-medium text-gray-500 dark:text-gray-400">
              Questionnaire QCM
              <button type="button" onClick={addQuestion} className="text-primary hover:underline">
                + Ajouter une question
              </button>
            </label>
            <div className="space-y-4">
              {questions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="rounded-2xl border border-gray-200/90 bg-white/60 p-4 dark:border-gray-700 dark:bg-gray-900/50"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                      Question {qIdx + 1}
                    </span>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        className="text-rose-500 hover:text-rose-600"
                      >
                        <Icon icon="solar:trash-bin-minimalistic-bold" className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  <div className="space-y-3">
                    <input
                      value={q.question}
                      onChange={(e) => updateQuestion(qIdx, { question: e.target.value })}
                      className={inputClass}
                      placeholder="Intitulé de la question"
                    />
                    <div className="grid gap-2 sm:grid-cols-2">
                      {q.propositions.map((p, pIdx) => (
                        <div key={pIdx} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`bonne-${qIdx}`}
                            checked={q.bonneReponse === pIdx}
                            onChange={() => updateQuestion(qIdx, { bonneReponse: pIdx })}
                            title="Bonne réponse"
                            className="h-4 w-4 accent-primary"
                          />
                          <input
                            value={p}
                            onChange={(e) => updateProposition(qIdx, pIdx, e.target.value)}
                            className={inputClass}
                            placeholder={`Proposition ${pIdx + 1}`}
                          />
                          {q.propositions.length > 2 && (
                            <button
                              type="button"
                              onClick={() => removeProposition(qIdx, pIdx)}
                              className="text-rose-500 hover:text-rose-600"
                            >
                              <Icon icon="solar:close-circle-bold" className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addProposition(qIdx)}
                      className="text-xs font-semibold text-primary hover:underline"
                    >
                      + Ajouter une proposition
                    </button>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Points :</label>
                      <input
                        type="number"
                        min={1}
                        value={q.points}
                        onChange={(e) => updateQuestion(qIdx, { points: Number(e.target.value) || 1 })}
                        className={`${inputClass} w-24`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input
              id="actif"
              name="actif"
              type="checkbox"
              defaultChecked={data.actif}
              className="h-4 w-4 accent-primary"
            />
            <label htmlFor="actif" className="text-xs font-medium text-gray-600 dark:text-gray-300">
              Formation active
            </label>
          </div>
        </div>

        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/5">
          <p className="mb-3 text-sm font-semibold text-midnight_text dark:text-white">QR code de la formation</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
              <QRCodeSVG value={publicUrl} size={160} level="H" includeMargin />
            </div>
            <div className="text-center sm:text-left">
              <p className="max-w-xs break-all text-xs text-gray-500 dark:text-gray-400">{publicUrl}</p>
              <p className="mt-1 text-xs text-gray-400">Scanné, ce code redirige vers la page publique.</p>
            </div>
          </div>
        </div>

        {message && (
          <p
            className={`text-sm ${message.includes("Erreur") || message.includes("impossible") ? "text-rose-600" : "text-emerald-600"}`}
          >
            {message}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <Link
            href="/formations"
            className="rounded-xl border border-gray-200 px-6 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Retour
          </Link>
        </div>
      </form>
    </section>
  );
}
