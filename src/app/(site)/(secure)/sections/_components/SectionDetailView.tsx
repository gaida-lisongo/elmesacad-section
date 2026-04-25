"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react";
import Breadcrumb from "@/components/Breadcrumb";
import { STUDENT_CYCLES } from "@/lib/constants/studentCycles";
import { TitleContentBlocksEditor, type TitleContentBlock } from "@/components/TitleContentBlocksEditor";
import { BureauAgentField, bureauRefToAgentPick, type AgentPick } from "./BureauAgentField";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-[#082b1c]/40 focus:outline-none focus:ring-2 focus:ring-[#082b1c]/15 dark:border-gray-600 dark:bg-gray-800 dark:text-white";

type BureauRef = { _id?: string; name?: string; email?: string } | string | null;

type SectionPayload = {
  _id: string;
  slug: string;
  designation: string;
  cycle: string;
  email?: string;
  website?: string;
  telephone?: string;
  description?: { title: string; contenu: string }[];
  logo: string;
  bureau?: {
    chefSection?: BureauRef;
    chargeEnseignement?: BureauRef;
    chargeRecherche?: BureauRef;
  };
  apiKey?: string | null;
  secretKey?: string | null;
  canEditKeys: boolean;
};

function apiToDescBlocks(
  d: { title: string; contenu: string }[] | undefined
): TitleContentBlock[] {
  if (!d?.length) return [];
  return d.map((b) => ({
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `b-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: b.title,
    contenu: b.contenu,
  }));
}

const tabs = [
  { id: "info" as const, label: "Informations" },
  { id: "description" as const, label: "Description" },
  { id: "bureau" as const, label: "Bureau" },
  { id: "security" as const, label: "Sécurité" },
];

export default function SectionDetailView({ slug }: { slug: string }) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("info");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SectionPayload | null>(null);

  const [showApi, setShowApi] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [shareEmail, setShareEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const [bureauChef, setBureauChef] = useState<AgentPick | null>(null);
  const [bureauEns, setBureauEns] = useState<AgentPick | null>(null);
  const [bureauRech, setBureauRech] = useState<AgentPick | null>(null);
  const [descBlocks, setDescBlocks] = useState<TitleContentBlock[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sections/slug/${encodeURIComponent(slug)}`);
      const json = (await res.json()) as { data?: SectionPayload; message?: string };
      if (!res.ok) {
        setError(json.message ?? "Chargement impossible");
        setData(null);
        return;
      }
      if (json.data) {
        setData({
          ...json.data,
          _id: String(json.data._id ?? ""),
        });
      }
    } catch {
      setError("Réseau");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!data) return;
    setBureauChef(bureauRefToAgentPick(data.bureau?.chefSection));
    setBureauEns(bureauRefToAgentPick(data.bureau?.chargeEnseignement));
    setBureauRech(bureauRefToAgentPick(data.bureau?.chargeRecherche));
    setDescBlocks(apiToDescBlocks(data.description));
  }, [data]);

  const patch = async (body: Record<string, unknown>) => {
    setMessage(null);
    const res = await fetch(`/api/sections/slug/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as { data?: SectionPayload; message?: string };
    if (!res.ok) {
      setMessage(json.message ?? "Erreur");
      return;
    }
    if (json.data) {
      setData({ ...json.data, _id: String(json.data._id ?? "") });
      setMessage("Enregistré.");
    }
  };

  const onSaveInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    await patch({
      designation: String(fd.get("designation") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim() || undefined,
      website: String(fd.get("website") ?? "").trim() || undefined,
      telephone: String(fd.get("telephone") ?? "").trim() || undefined,
      cycle: String(fd.get("cycle") ?? "").trim(),
    });
  };

  const onSaveDescription = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const description = descBlocks
      .map((b) => ({
        title: b.title.trim(),
        contenu: b.contenu.trim(),
      }))
      .filter((b) => b.title.length > 0 || b.contenu.length > 0)
      .map((b) => ({ title: b.title || "Sans titre", contenu: b.contenu }));
    await patch({ description });
  };

  const onSaveBureau = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await patch({
      bureau: {
        chefSection: bureauChef?.id ?? "",
        chargeEnseignement: bureauEns?.id ?? "",
        chargeRecherche: bureauRech?.id ?? "",
      },
    });
  };

  const mask = (v: string | null | undefined, show: boolean) => {
    if (v == null || v === "") return "••••••••";
    if (!show) return "•".repeat(Math.min(32, v.length));
    return v;
  };

  const regenerate = async () => {
    if (!confirm("Régénérer les clés ? Les anciennes cesseront de fonctionner.")) return;
    setMessage(null);
    const res = await fetch(`/api/sections/slug/${encodeURIComponent(slug)}/regenerate-keys`, {
      method: "POST",
    });
    const json = (await res.json()) as { apiKey?: string; secretKey?: string; message?: string };
    if (!res.ok) {
      setMessage(json.message ?? "Impossible");
      return;
    }
    if (data && json.apiKey && json.secretKey) {
      setData({ ...data, apiKey: json.apiKey, secretKey: json.secretKey });
      setShowApi(true);
      setShowSecret(true);
    }
    setMessage("Nouvelles clés générées.");
  };

  const shareKeys = async () => {
    setMessage(null);
    const res = await fetch(`/api/sections/slug/${encodeURIComponent(slug)}/share-keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: shareEmail.trim() }),
    });
    const json = (await res.json()) as { message?: string };
    if (!res.ok) {
      setMessage(json.message ?? "Envoi impossible");
      return;
    }
    setMessage("E-mail envoyé.");
    setShareEmail("");
  };

  if (loading) {
    return (
      <section className="w-full rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-body-color dark:border-gray-800 dark:bg-gray-900">
        Chargement…
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="w-full rounded-xl border border-rose-200 bg-rose-50/50 p-6 dark:border-rose-900 dark:bg-rose-950/30">
        <p className="text-sm text-rose-700 dark:text-rose-300">{error ?? "Introuvable"}</p>
        <Link href="/sections" className="mt-3 inline-block text-sm font-semibold text-[#082b1c]">
          Retour aux sections
        </Link>
      </section>
    );
  }

  return (
    <section className="w-full max-w-full rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-2 w-full">
        <Breadcrumb
          links={[
            { href: "/", text: "Accueil" },
            { href: "/sections", text: "Sections" },
            { href: `/sections/${data.slug}`, text: data.designation },
          ]}
        />
      </div>

      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{data.designation}</h1>
          <p className="mt-1 text-sm text-body-color">Slug : {data.slug}</p>
        </div>
        <div className="relative h-16 w-16 overflow-hidden rounded-2xl ring-1 ring-gray-200 dark:ring-gray-700">
          <Image
            src={data.logo || "/images/blog/blog_2.jpg"}
            alt={data.designation}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
      </header>

      <div className="mb-6 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              tab === t.id
                ? "bg-[#082b1c] text-white"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-200">
          {message}
        </p>
      )}

      {tab === "info" && (
        <form onSubmit={onSaveInfo} className="w-full space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-500">Désignation</label>
              <input
                name="designation"
                defaultValue={data.designation}
                required
                className={inputClass}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Cycle</label>
              <select name="cycle" defaultValue={data.cycle} className={inputClass}>
                {STUDENT_CYCLES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">E-mail</label>
              <input name="email" type="email" defaultValue={data.email ?? ""} className={inputClass} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-500">Site web</label>
              <input name="website" type="url" defaultValue={data.website ?? ""} className={inputClass} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-gray-500">Téléphone</label>
              <input name="telephone" defaultValue={data.telephone ?? ""} className={inputClass} />
            </div>
          </div>
          <button
            type="submit"
            className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Enregistrer
          </button>
        </form>
      )}

      {tab === "description" && (
        <form onSubmit={onSaveDescription} className="w-full space-y-4">
          <p className="text-sm text-body-color">
            Gérez les blocs (titre + contenu) qui décrivent la section. Même outil qu’à la création.
          </p>
          <TitleContentBlocksEditor
            value={descBlocks}
            onChange={setDescBlocks}
            addLabel="Ajouter un bloc de description"
            emptyHint="Aucun bloc. Ajoutez des sections de texte (présentation, objectifs, etc.)."
            titleFieldLabel="Titre du bloc"
            contentFieldLabel="Contenu"
          />
          <button
            type="submit"
            className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Enregistrer la description
          </button>
        </form>
      )}

      {tab === "bureau" && (
        <form onSubmit={onSaveBureau} className="w-full space-y-4">
          <p className="text-xs text-body-color">
            Recherchez un agent par nom, e-mail ou matricule, puis sélectionnez-le. Utilisez « Retirer » pour
            détacher le rôle.
          </p>
          <BureauAgentField
            label="Chef de section"
            value={bureauChef}
            onChange={setBureauChef}
          />
          <BureauAgentField
            label="Chargé d&apos;enseignement"
            value={bureauEns}
            onChange={setBureauEns}
          />
          <BureauAgentField
            label="Chargé de recherche"
            value={bureauRech}
            onChange={setBureauRech}
          />
          <button
            type="submit"
            className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Enregistrer le bureau
          </button>
        </form>
      )}

      {tab === "security" && (
        <div className="w-full space-y-6">
          {!data.canEditKeys && (
            <p className="text-sm text-amber-800 dark:text-amber-200">
              Seul un administrateur peut voir ou gérer les clés d&apos;API.
            </p>
          )}

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">API key</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 break-all rounded-lg bg-gray-100 px-3 py-2 text-xs dark:bg-gray-800">
                {data.canEditKeys ? mask(data.apiKey ?? null, showApi) : "••••••••"}
              </code>
              {data.canEditKeys && data.apiKey && (
                <button
                  type="button"
                  onClick={() => setShowApi((s) => !s)}
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold dark:border-gray-600"
                >
                  {showApi ? "Masquer" : "Afficher"}
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Secret</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="flex-1 min-w-0 break-all rounded-lg bg-gray-100 px-3 py-2 text-xs dark:bg-gray-800">
                {data.canEditKeys ? mask(data.secretKey ?? null, showSecret) : "••••••••"}
              </code>
              {data.canEditKeys && data.secretKey && (
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="shrink-0 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-semibold dark:border-gray-600"
                >
                  {showSecret ? "Masquer" : "Afficher"}
                </button>
              )}
            </div>
          </div>

          {data.canEditKeys && (
            <div className="flex flex-col gap-4 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={regenerate}
                className="inline-flex w-fit items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200"
              >
                <Icon icon="solar:refresh-bold" className="h-4 w-4" />
                Régénérer les clés
              </button>

              <div>
                <p className="mb-2 text-sm font-medium">Partager par e-mail</p>
                <div className="flex flex-wrap gap-2">
                  <input
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder="destinataire@exemple.com"
                    className={inputClass + " min-w-56 flex-1"}
                  />
                  <button
                    type="button"
                    onClick={shareKeys}
                    disabled={!shareEmail.trim()}
                    className="rounded-md bg-[#082b1c] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Envoyer
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
