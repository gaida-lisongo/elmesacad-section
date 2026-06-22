"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { QRCodeSVG } from "qrcode.react";
import { resolvePublicOrigin } from "@/lib/ticket/buildTicketPublicUrl";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

export type FormationListItem = {
  id: string;
  slug: string;
  titre: string;
  description: string;
  objectifs: string[];
  questionnaire: QuestionPayload[];
  dateFormation: string;
  image: string;
  actif: boolean;
  createdAt?: string;
};

export type QuestionPayload = {
  question: string;
  propositions: string[];
  bonneReponse: number;
  points: number;
};

export type ParticipantItem = {
  _id: string;
  note: number;
  score: number;
  mention: string;
  completedAt?: string;
  createdAt?: string;
  user?: {
    _id?: string;
    name?: string;
    email?: string;
    matricule?: string;
  };
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function getFormationPublicUrl(slug: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : resolvePublicOrigin();
  return `${origin}/formations/${slug}`;
}

export function FormationCardItem({
  item,
  onDelete,
}: {
  item: FormationListItem;
  onDelete?: (id: string) => void;
}) {
  const [showQr, setShowQr] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);
  const publicUrl = getFormationPublicUrl(item.slug);

  const loadParticipants = async () => {
    if (participants.length > 0) {
      setShowParticipants((prev) => !prev);
      return;
    }
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/formations/${item.id}/participants`);
      const json = (await res.json()) as { data?: ParticipantItem[] };
      setParticipants(json.data ?? []);
      setShowParticipants(true);
    } catch {
      setParticipants([]);
      setShowParticipants(true);
    } finally {
      setLoadingParticipants(false);
    }
  };

  const downloadQrPng = async () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector("svg");
    if (!svg) return;

    const serializer = new XMLSerializer();
    const svgString = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new globalThis.Image();
    const rect = svg.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) || 256;
    const canvas = document.createElement("canvas");
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const a = document.createElement("a");
      a.href = canvas.toDataURL("image/png");
      a.download = `qr-formation-${item.slug}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    img.src = url;
  };

  const printQrDocument = () => {
    const w = window.open("", "_blank", "width=700,height=900");
    if (!w) return;
    const qrHtml = qrRef.current?.innerHTML ?? "";
    w.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Formation — ${item.titre}</title>
          <style>
            * { box-sizing: border-box; }
            body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #fff; color: #111; }
            .page { width: 210mm; min-height: 297mm; margin: 0 auto; padding: 24mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; border: 1px dashed #ddd; }
            .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; background: #058ac5; color: #fff; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 24px; }
            h1 { font-size: 32px; font-weight: 800; margin: 0 0 12px; color: #0f172a; }
            .date { color: #64748b; font-size: 15px; margin-bottom: 32px; }
            .qr-wrap { padding: 18px; border-radius: 20px; background: #fff; box-shadow: 0 18px 50px -12px rgba(5,138,197,0.25); border: 1px solid #e2e8f0; margin-bottom: 28px; }
            .qr-wrap svg { display: block; width: 220px; height: 220px; }
            .url { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #475569; word-break: break-all; max-width: 480px; margin-bottom: 32px; }
            .footer { margin-top: auto; font-size: 11px; color: #94a3b8; }
            @media print { .page { border: none; } }
          </style>
        </head>
        <body>
          <div class="page">
            <span class="badge">Formation</span>
            <h1>${item.titre.replace(/</g, "&lt;")}</h1>
            <p class="date">${formatDate(item.dateFormation)}</p>
            <div class="qr-wrap">${qrHtml}</div>
            <p class="url">${publicUrl}</p>
            <p class="footer">Scannez ce QR code pour accéder à la formation.</p>
          </div>
          <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); };</script>
        </body>
      </html>
    `);
    w.document.close();
  };

  return (
    <div className="w-full">
      <div className="flex w-full flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-2 ring-white dark:bg-gray-800 dark:ring-gray-800">
            <Image
              src={item.image || "/images/blog/blog_2.jpg"}
              alt={item.titre}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-base font-bold text-midnight_text dark:text-white">{item.titre}</h3>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  item.actif
                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                }`}
              >
                {item.actif ? "Active" : "Inactive"}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">/{item.slug}</p>
            <p className="mt-1 line-clamp-2 text-xs text-body-color">{item.description || "Aucune description"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1">
                <Icon icon="solar:calendar-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                {formatDate(item.dateFormation)}
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="solar:help-circle-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                {item.questionnaire.length} QCM
              </span>
              <span className="flex items-center gap-1">
                <Icon icon="solar:checklist-bold-duotone" className="h-3.5 w-3.5 text-primary" />
                {item.objectifs.length} objectifs
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowQr((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/20 dark:bg-primary/15 dark:text-emerald-300"
          >
            <Icon icon="solar:qr-code-bold-duotone" className="h-4 w-4" />
            QR
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              loadParticipants();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <Icon icon="solar:users-group-rounded-bold-duotone" className="h-4 w-4" />
            Participants
          </button>

          <Link
            href={`/formations/${item.slug}/edit`}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 text-gray-500 transition hover:bg-primary/10 hover:text-primary dark:bg-gray-800"
            title="Modifier"
          >
            <Icon icon="solar:pen-new-square-bold-duotone" className="h-5 w-5" />
          </Link>

          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-500 transition hover:bg-rose-100 dark:bg-rose-900/20"
              title="Supprimer"
            >
              <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {showQr && (
        <div className="mt-5 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/5">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:items-start">
            <div ref={qrRef} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900">
              <QRCodeSVG value={publicUrl} size={180} level="H" includeMargin />
            </div>
            <div className="flex flex-col gap-2 text-center sm:text-left">
              <p className="text-sm font-semibold text-midnight_text dark:text-white">Lien public de la formation</p>
              <p className="max-w-xs break-all text-xs text-gray-500 dark:text-gray-400">{publicUrl}</p>
              <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                <button
                  type="button"
                  onClick={printQrDocument}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <Icon icon="solar:printer-bold-duotone" className="h-4 w-4" />
                  Imprimer / PDF
                </button>
                <button
                  type="button"
                  onClick={downloadQrPng}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 text-xs font-semibold text-primary"
                >
                  <Icon icon="solar:download-bold-duotone" className="h-4 w-4" />
                  PNG
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr(false)}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showParticipants && (
        <div className="mt-5 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-bold text-midnight_text dark:text-white">Participants</h4>
            <button
              type="button"
              onClick={() => setShowParticipants(false)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Fermer
            </button>
          </div>
          {loadingParticipants ? (
            <p className="py-4 text-center text-xs text-gray-500">Chargement…</p>
          ) : participants.length === 0 ? (
            <p className="py-4 text-center text-xs text-gray-400">Aucun participant pour le moment.</p>
          ) : (
            <div className="max-h-64 overflow-auto">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 bg-white dark:bg-gray-900">
                  <tr className="text-gray-400">
                    <th className="py-2 pr-3 font-semibold">Nom</th>
                    <th className="py-2 pr-3 font-semibold">Matricule</th>
                    <th className="py-2 pr-3 font-semibold">Note</th>
                    <th className="py-2 pr-3 font-semibold">Mention</th>
                    <th className="py-2 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p._id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2 pr-3 font-medium text-midnight_text dark:text-white">
                        {p.user?.name ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-gray-500">{p.user?.matricule ?? "—"}</td>
                      <td className="py-2 pr-3 font-semibold text-primary">{p.note ?? p.score ?? "—"}/20</td>
                      <td className="py-2 pr-3 text-gray-500">{p.mention ?? "—"}</td>
                      <td className="py-2 text-gray-500">{formatDate(p.completedAt ?? p.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function FormationCardCreate() {
  const [image, setImage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [objectifs, setObjectifs] = useState<string[]>([""]);
  const [questions, setQuestions] = useState<QuestionPayload[]>([
    { question: "", propositions: ["", ""], bonneReponse: 0, points: 2 },
  ]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/formations/upload-image", { method: "POST", body: fd });
      const data = (await res.json()) as { image?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Upload impossible");
        return;
      }
      if (data.image) setImage(data.image);
    } catch {
      setError("Upload impossible");
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

  const objectifsJson = useMemo(() => JSON.stringify(objectifs.filter((o) => o.trim())), [objectifs]);
  const questionnaireJson = useMemo(() => JSON.stringify(questions), [questions]);

  return (
    <div className="space-y-6">
      <input type="hidden" name="image" value={image} readOnly />
      <input type="hidden" name="objectifs" value={objectifsJson} readOnly />
      <input type="hidden" name="questionnaire" value={questionnaireJson} readOnly />

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Titre *</label>
          <input name="titre" required className={inputClass} placeholder="ex. Formation sécurité chantier" />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">
            Date de formation *
          </label>
          <input name="dateFormation" type="datetime-local" required className={inputClass} />
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
            <Icon icon="solar:gallery-round-bold-duotone" className="h-4 w-4 text-primary" />
            Image *
          </label>
          <div className="flex flex-wrap items-center gap-3">
            {image && (
              <div className="relative h-16 w-16 overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-600">
                <Image src={image} alt="Aperçu" fill className="object-cover" sizes="64px" />
              </div>
            )}
            <input type="file" accept="image/*" onChange={onFile} disabled={uploading} className="text-xs" />
            {uploading && <span className="text-xs text-gray-500">Envoi…</span>}
            {!image && <span className="text-xs text-amber-600">Image requise</span>}
          </div>
        </div>

        <div className="md:col-span-2">
          <label className="mb-1.5 block text-xs font-medium text-gray-500 dark:text-gray-400">Description</label>
          <textarea name="description" rows={3} className={inputClass} placeholder="Description de la formation…" />
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
                  <button type="button" onClick={() => removeObjectif(i)} className="text-rose-500 hover:text-rose-600">
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
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">Question {qIdx + 1}</span>
                  {questions.length > 1 && (
                    <button type="button" onClick={() => removeQuestion(qIdx)} className="text-rose-500 hover:text-rose-600">
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
          <input id="actif" name="actif" type="checkbox" defaultChecked className="h-4 w-4 accent-primary" />
          <label htmlFor="actif" className="text-xs font-medium text-gray-600 dark:text-gray-300">
            Formation active
          </label>
        </div>

        {error && <p className="md:col-span-2 text-xs text-rose-600">{error}</p>}
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5 dark:border-gray-800">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:opacity-90"
        >
          <Icon icon="solar:check-circle-bold-duotone" className="h-4 w-4" />
          Créer la formation
        </button>
      </div>
    </div>
  );
}
