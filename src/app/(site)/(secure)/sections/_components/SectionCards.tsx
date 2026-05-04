"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { BureauAgentField, type AgentPick } from "./BureauAgentField";
import {
  TitleContentBlocksEditor,
  type TitleContentBlock,
} from "@/components/TitleContentBlocksEditor";

const inputClass =
  "w-full rounded-xl border border-gray-200 bg-white/80 px-4 py-3 text-sm shadow-sm transition placeholder:text-gray-400 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/15 dark:border-gray-600 dark:bg-gray-800/80 dark:text-white";

const steps = [
  { id: 1, label: "Infos" },
  { id: 2, label: "Description" },
  { id: 3, label: "Bureau" },
] as const;

export type DescriptionBlock = { title: string; contenu: string };

export type SectionListItem = {
  id: string;
  slug: string;
  designation: string;
  cycle: string;
  email?: string;
  logo: string;
  description: DescriptionBlock[];
};

export function SectionCardItem({ item }: { item: SectionListItem }) {
  const [descTab, setDescTab] = useState(0);
  const descBlocks = item.description ?? [];
  const descIdx = descBlocks.length ? Math.min(descTab, descBlocks.length - 1) : 0;
  const activeBlock = descBlocks[descIdx];

  useEffect(() => {
    setDescTab(0);
  }, [item.id]);

  return (
    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white via-white to-gray-50/90 p-5 shadow-[0_4px_24px_-4px_rgba(5, 138, 197,0.12)] ring-1 ring-gray-200/80 transition duration-300 ease-out hover:-translate-y-0.5 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950 dark:ring-gray-700/80">
      <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br from-primary/8 to-transparent blur-2xl" />

      <div className="relative flex items-start gap-4">
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gray-100 shadow-md ring-2 ring-white dark:bg-gray-800 dark:ring-gray-800">
          <Image
            src={item.logo || "/images/blog/blog_2.jpg"}
            alt={item.designation}
            fill
            className="object-cover"
            sizes="64px"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold tracking-tight text-midnight_text dark:text-white">
            {item.designation}
          </h3>
          {item.email && (
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-gray-500 dark:text-gray-400">
              <Icon icon="solar:letter-bold-duotone" className="h-4 w-4 shrink-0" />
              {item.email}
            </p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary dark:bg-primary/15 dark:text-emerald-300">
          {item.cycle}
        </span>
      </div>

      {descBlocks.length > 0 && (
        <div className="relative mt-3 rounded-xl border border-gray-200/80 bg-white/50 p-2.5 dark:border-gray-700/80 dark:bg-gray-900/40">
          <p className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            <Icon icon="solar:document-text-bold-duotone" className="h-3.5 w-3.5" />
            Description
          </p>
          <div className="mb-2 flex max-h-9 flex-wrap gap-1.5 overflow-x-auto overflow-y-hidden pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {descBlocks.map((b, i) => (
              <button
                key={`${item.id}-desc-${i}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDescTab(i);
                }}
                className={`max-w-full shrink-0 truncate rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                  i === descIdx
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
                title={b.title}
              >
                {b.title || `Bloc ${i + 1}`}
              </button>
            ))}
          </div>
          {activeBlock && (
            <p className="max-h-24 overflow-y-auto text-xs leading-relaxed text-body-color [scrollbar-gutter:stable]">
              {activeBlock.contenu}
            </p>
          )}
        </div>
      )}

      <Link
        href={`/sections/${item.slug}`}
        className="group/btn mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition duration-300 hover:scale-[1.02]"
      >
        Voir le détail
        <Icon icon="solar:arrow-right-linear" className="h-4 w-4 transition group-hover/btn:translate-x-0.5" />
      </Link>
    </div>
  );
}

type SectionCardCreateProps = {
  defaultCycle: string;
};

function blocksToDescriptionPayload(blocks: TitleContentBlock[]) {
  return blocks
    .map((b) => ({
      title: b.title.trim(),
      contenu: b.contenu.trim(),
    }))
    .filter((b) => b.title.length > 0 || b.contenu.length > 0)
    .map((b) => ({
      title: b.title || "Sans titre",
      contenu: b.contenu,
    }));
}

export function SectionCardCreate({ defaultCycle }: SectionCardCreateProps) {
  const [step, setStep] = useState<(typeof steps)[number]["id"]>(1);
  const [logo, setLogo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [descBlocks, setDescBlocks] = useState<TitleContentBlock[]>([]);
  const [bureauChef, setBureauChef] = useState<AgentPick | null>(null);
  const [bureauEns, setBureauEns] = useState<AgentPick | null>(null);
  const [bureauRech, setBureauRech] = useState<AgentPick | null>(null);

  const descriptionJson = useMemo(
    () => JSON.stringify(blocksToDescriptionPayload(descBlocks)),
    [descBlocks]
  );

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/sections/upload-logo", { method: "POST", body: fd });
      const data = (await res.json()) as { logo?: string; message?: string };
      if (!res.ok) {
        setError(data.message ?? "Upload impossible");
        return;
      }
      if (data.logo) setLogo(data.logo);
    } catch {
      setError("Upload impossible");
    } finally {
      setUploading(false);
    }
  };

  const validateStep1 = (form: HTMLFormElement) => {
    const designation = String((form.elements.namedItem("designation") as HTMLInputElement | null)?.value ?? "").trim();
    if (!designation) {
      setError("La désignation est obligatoire.");
      return false;
    }
    if (!logo) {
      setError("Le logo est obligatoire (envoyez une image).");
      return false;
    }
    setError(null);
    return true;
  };

  const goNext = (form: HTMLFormElement) => {
    if (step === 1) {
      if (!validateStep1(form)) return;
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(3);
    }
  };

  const goPrev = () => {
    setError(null);
    if (step === 2) setStep(1);
    else if (step === 3) setStep(2);
  };

  return (
    <div className="rounded-2xl bg-gradient-to-br from-gray-50/95 to-white p-1 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.8)] ring-1 ring-gray-200/90 dark:from-gray-900 dark:to-gray-900 dark:ring-gray-700">
      <input type="hidden" name="logo" value={logo} readOnly />
      <input type="hidden" name="descriptionJson" value={descriptionJson} readOnly />

      <div className="mb-4 flex items-center justify-between gap-2 border-b border-gray-200/80 pb-3 dark:border-gray-700">
        {steps.map((s, i) => (
          <div key={s.id} className="flex flex-1 items-center gap-1.5">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                step >= s.id
                  ? "bg-primary text-white"
                  : "bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400"
              }`}
            >
              {s.id}
            </div>
            <span
              className={`hidden text-xs font-semibold sm:inline ${
                step === s.id ? "text-primary dark:text-emerald-300" : "text-gray-500"
              }`}
            >
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <div
                className={`mx-1 hidden h-px min-w-[12px] flex-1 sm:block ${
                  step > s.id ? "bg-primary/40" : "bg-gray-200 dark:bg-gray-700"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-white/60 p-4 backdrop-blur-sm dark:bg-gray-900/40">
        {/* Tout reste dans le DOM (masqué) pour que le FormData du parent contienne tous les champs au submit. */}
        <div className={step === 1 ? "block" : "hidden"} aria-hidden={step !== 1}>
          <div className="grid gap-3 md:grid-cols-2">
            <p className="md:col-span-2 text-xs text-body-color">
              Mention appliquée à la création : <strong>{defaultCycle}</strong> (selon l&apos;onglet actif ci-dessus).
            </p>

            <div className="md:col-span-2">
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                <Icon icon="solar:gallery-round-bold-duotone" className="h-4 w-4 text-primary" />
                Logo *
              </label>
              <div className="flex flex-wrap items-center gap-3">
                {logo && (
                  <div className="relative h-14 w-14 overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-600">
                    <Image src={logo} alt="Logo" width={56} height={56} className="h-full w-full object-cover" />
                  </div>
                )}
                <input type="file" accept="image/*" onChange={onFile} disabled={uploading} className="text-xs" />
                {uploading && <span className="text-xs text-gray-500">Envoi…</span>}
                {!logo && <span className="text-xs text-amber-600">Image requise</span>}
              </div>
            </div>

            <div>
              <label className="mb-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">Désignation *</label>
              <input name="designation" className={inputClass} placeholder="ex. BTP L1" />
            </div>
            <div>
              <label className="mb-1.5 text-xs text-gray-500">E-mail</label>
              <input name="email" type="email" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 text-xs text-gray-500">Téléphone</label>
              <input name="telephone" type="tel" className={inputClass} />
            </div>
            <div>
              <label className="mb-1.5 text-xs text-gray-500">Site web</label>
              <input name="website" type="url" className={inputClass} placeholder="https://" />
            </div>

            {error && <p className="md:col-span-2 text-xs text-rose-600">{error}</p>}

            <div className="md:col-span-2 flex justify-end">
              <button
                type="button"
                onClick={(e) => goNext(e.currentTarget.closest("form") as HTMLFormElement)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
              >
                Suivant
                <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className={step === 2 ? "block" : "hidden"} aria-hidden={step !== 2}>
          <div className="space-y-4">
            <p className="text-sm text-midnight_text dark:text-white">
              Ajoutez autant de blocs que nécessaire : chaque bloc a un titre et un contenu.
            </p>
            <TitleContentBlocksEditor
              value={descBlocks}
              onChange={setDescBlocks}
              addLabel="Ajouter un bloc de description"
              emptyHint="Aucun bloc pour l’instant. Ajoutez des blocs pour présenter la section (missions, organisation, etc.)."
              titleFieldLabel="Titre du bloc"
              contentFieldLabel="Contenu"
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex flex-wrap justify-between gap-2 pt-2">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
                Précédent
              </button>
              <button
                type="button"
                onClick={(e) => goNext(e.currentTarget.closest("form") as HTMLFormElement)}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white"
              >
                Suivant
                <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        <div className={step === 3 ? "block" : "hidden"} aria-hidden={step !== 3}>
          <div className="space-y-4">
            <p className="text-sm text-body-color">
              Définissez l&apos;équipe de direction : recherchez un agent par nom, e-mail ou matricule.
            </p>
            <BureauAgentField
              name="chefSection"
              label="Chef de section"
              value={bureauChef}
              onChange={setBureauChef}
            />
            <BureauAgentField
              name="chargeEnseignement"
              label="Chargé d&apos;enseignement"
              value={bureauEns}
              onChange={setBureauEns}
            />
            <BureauAgentField
              name="chargeRecherche"
              label="Chargé de recherche"
              value={bureauRech}
              onChange={setBureauRech}
            />
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-4 dark:border-gray-700">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 dark:border-gray-600 dark:text-gray-200"
              >
                <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
                Précédent
              </button>
              <button
                type="submit"
                disabled={!logo || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-primary to-darkprimary px-5 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
              >
                <Icon icon="solar:check-circle-bold" className="h-5 w-5" />
                Créer la section
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
