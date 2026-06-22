"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Breadcrumb from "@/components/Breadcrumb";
import { QRCodeSVG } from "qrcode.react";
import { resolvePublicOrigin } from "@/lib/ticket/buildTicketPublicUrl";

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

type ParticipantItem = {
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
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function FormationViewPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");

  const [data, setData] = useState<FormationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);

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
      if (json.data) setData(json.data);
    } catch {
      setError("Réseau");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  const loadParticipants = useCallback(async () => {
    if (!data) return;
    setLoadingParticipants(true);
    try {
      const res = await fetch(`/api/formations/${data._id}/participants`);
      const json = (await res.json()) as { data?: ParticipantItem[] };
      setParticipants(json.data ?? []);
    } catch {
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  }, [data]);

  useEffect(() => {
    if (slug) load();
  }, [load, slug]);

  useEffect(() => {
    loadParticipants();
  }, [loadParticipants]);

  const publicUrl = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : resolvePublicOrigin();
    return `${origin}/formations/${slug}`;
  }, [slug]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === participants.length && participants.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(participants.map((p) => p._id)));
    }
  };

  const generateCertificatesBulk = async () => {
    if (selectedIds.size === 0) {
      window.alert("Sélectionnez au moins un participant.");
      return;
    }
    setGenerating(true);
    try {
      const res = await fetch(`/api/formations/${data?._id}/certificats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: Array.from(selectedIds) }),
      });
      const json = (await res.json()) as { pdfBase64?: string; filename?: string; message?: string };
      if (!res.ok || !json.pdfBase64) {
        window.alert(json.message ?? "Génération impossible");
        return;
      }
      const bin = atob(json.pdfBase64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = json.filename?.toLowerCase().endsWith(".pdf") ? json.filename : `${json.filename ?? "certificats"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("Erreur réseau");
    } finally {
      setGenerating(false);
    }
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

      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{data.titre}</h1>
          <p className="mt-1 text-sm text-body-color">{data.description || "Aucune description"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Icon icon="solar:calendar-bold-duotone" className="h-3.5 w-3.5 text-primary" />
              {formatDate(data.dateFormation)}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                data.actif
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {data.actif ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
        <Link
          href={`/formations/${slug}/edit`}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:opacity-90"
        >
          <Icon icon="solar:pen-new-square-bold-duotone" className="h-4 w-4" />
          Modifier
        </Link>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
            <Image
              src={data.image || "/images/blog/blog_2.jpg"}
              alt={data.titre}
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 66vw"
            />
          </div>

          {data.objectifs.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-midnight_text dark:text-white">Objectifs</h2>
              <ul className="space-y-2">
                {data.objectifs.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-body-color">
                    <Icon icon="solar:check-circle-bold-duotone" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.questionnaire.length > 0 && (
            <div>
              <h2 className="mb-3 text-sm font-bold text-midnight_text dark:text-white">
                Questionnaire ({data.questionnaire.length})
              </h2>
              <div className="space-y-3">
                {data.questionnaire.map((q, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-gray-100 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-gray-900/40"
                  >
                    <p className="text-sm font-semibold text-midnight_text dark:text-white">
                      {i + 1}. {q.question}
                    </p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      {q.propositions.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs ${
                            pIdx === q.bonneReponse
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
                              : "bg-white text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                          }`}
                        >
                          <Icon
                            icon={pIdx === q.bonneReponse ? "solar:check-circle-bold" : "solar:close-circle-bold"}
                            className="h-3.5 w-3.5 shrink-0"
                          />
                          {p}
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[10px] text-gray-400">{q.points} point{q.points > 1 ? "s" : ""}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-5 dark:border-primary/30 dark:bg-primary/5">
            <p className="mb-3 text-sm font-semibold text-midnight_text dark:text-white">QR code de la formation</p>
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-xl bg-white p-3 shadow-sm dark:bg-gray-900">
                <QRCodeSVG value={publicUrl} size={160} level="H" includeMargin />
              </div>
              <p className="max-w-xs break-all text-center text-xs text-gray-500 dark:text-gray-400">{publicUrl}</p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-midnight_text dark:text-white">
                Participants ({participants.length})
              </h2>
              {participants.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  {selectedIds.size === participants.length ? "Tout désélectionner" : "Tout sélectionner"}
                </button>
              )}
            </div>

            {loadingParticipants ? (
              <p className="py-4 text-center text-xs text-gray-500">Chargement…</p>
            ) : participants.length === 0 ? (
              <p className="rounded-xl border border-dashed border-gray-200 bg-gray-50/80 py-8 text-center text-xs text-gray-400 dark:border-gray-700 dark:bg-gray-900/40">
                Aucun participant pour le moment.
              </p>
            ) : (
              <div className="space-y-2">
                {participants.map((p) => (
                  <label
                    key={p._id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-gray-100 bg-white p-3 shadow-sm transition hover:border-primary/20 dark:border-gray-800 dark:bg-gray-900/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p._id)}
                      onChange={() => toggleSelection(p._id)}
                      className="h-4 w-4 accent-primary"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-midnight_text dark:text-white">
                        {p.user?.name ?? "—"}
                      </p>
                      <p className="text-[10px] text-gray-500">{p.user?.matricule ?? "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-primary">{p.note ?? p.score ?? "—"}/20</p>
                      <p className="text-[10px] text-gray-400">{p.mention ?? "—"}</p>
                    </div>
                  </label>
                ))}

                <button
                  type="button"
                  disabled={generating || selectedIds.size === 0}
                  onClick={generateCertificatesBulk}
                  className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 hover:opacity-90 disabled:opacity-50"
                >
                  <Icon icon="solar:diploma-bold-duotone" className="h-4 w-4" />
                  {generating ? "Génération…" : `Générer les certificats (${selectedIds.size})`}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
