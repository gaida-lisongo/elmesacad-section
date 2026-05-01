"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Icon } from "@iconify/react/dist/iconify.js";
import { useEffect, useMemo, useState } from "react";
import type { PublicSectionCard } from "@/actions/publicSections";
import SectionContactPanel from "@/components/Etudes/SectionContactPanel";

type Props = {
  section: PublicSectionCard;
};

export default function SectionDetailContent({ section }: Props) {
  const juryMembers = useMemo(() => section.juryMembers, [section.juryMembers]);
  const [activeJuryIndex, setActiveJuryIndex] = useState(0);

  useEffect(() => {
    if (juryMembers.length <= 1) return;
    const timer = window.setInterval(() => {
      setActiveJuryIndex((previous) => (previous + 1) % juryMembers.length);
    }, 3500);

    return () => window.clearInterval(timer);
  }, [juryMembers.length]);

  const activeJuryMember = juryMembers[activeJuryIndex];
  const showPreviousJuryMember = () => {
    if (juryMembers.length === 0) return;
    setActiveJuryIndex((previous) => (previous - 1 + juryMembers.length) % juryMembers.length);
  };

  const showNextJuryMember = () => {
    if (juryMembers.length === 0) return;
    setActiveJuryIndex((previous) => (previous + 1) % juryMembers.length);
  };

  const resources = [
    {
      categorySlug: "fiches-validation",
      label: "Fiche de validation",
      icon: "mdi:file-document-check-outline",
    },
    {
      categorySlug: "enrollements",
      label: "Enrollement",
      icon: "mdi:account-edit-outline",
    },
    {
      categorySlug: "releves",
      label: "Releve de cote",
      icon: "mdi:flask-outline",
    },
    {
      categorySlug: "laboratoires",
      label: "Laboratoire",
      icon: "mdi:flask-outline",
    },
    {
      categorySlug: "lettres-stage",
      label: "Lettre de stage",
      icon: "mdi:file-sign",
    },
    {
      categorySlug: "sujets-recherche",
      label: "Sujet de recherche",
      icon: "mdi:briefcase-search-outline",
    },
  ];
  const chefSection =
    section.bureauMembers.find((member) => member.role === "Chef de section") ?? section.bureauMembers[0];
  const missionItems =
    section.descriptionItems.length > 0
      ? section.descriptionItems
      : [
          {
            title: "Mission de la faculte",
            content: "Le contenu detaille de la mission sera publie prochainement.",
          },
        ];

  return (
    <main className="relative z-10 mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <motion.section
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="-mt-20 mb-8 sm:-mt-24"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {section.programmes.length > 0 ? (
            section.programmes.map((programme, index) => (
              <motion.div
                key={programme.id || programme.slug}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * Math.min(index, 6), duration: 0.45, ease: "easeOut" }}
              >
                <Link
                  href={programme.slug ? `/programme/${programme.slug}` : "#"}
                  className="group relative block min-h-[220px] rounded-sm border border-slate-300 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md dark:border-slate-700 dark:bg-darklight"
                >
                  <div className="absolute left-0 top-0 h-1 w-full bg-gradient-to-r from-primary via-primary/90 to-blue-700" />
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      <Icon icon="mdi:school-outline" className="text-2xl" />
                    </span>
                  </div>
                  <h2 className="max-w-[85%] text-3xl font-black leading-tight text-blue-950 dark:text-white">
                    {programme.designation}
                  </h2>
                  <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                    {programme.credits} credit(s)
                  </p>
                  <span
                    aria-hidden="true"
                    className="absolute bottom-5 right-5 text-5xl font-light leading-none text-primary transition-transform duration-200 group-hover:translate-x-1 dark:text-primary"
                  >
                    &#8594;
                  </span>
                </Link>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full rounded-2xl border border-dashed border-slate-300 p-5 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Aucun programme n&apos;est encore lie a cette section.
            </div>
          )}
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, duration: 0.45, ease: "easeOut" }}
        className="mb-8 rounded-sm border border-slate-300 bg-slate-100 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 sm:p-6"
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="overflow-hidden border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-darklight">
              {activeJuryMember ? (
                <motion.div
                  key={`${activeJuryMember.id}-${activeJuryMember.juryType}-${activeJuryMember.functionInJury}`}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <div className="h-56 w-full overflow-hidden">
                    <img
                      src={activeJuryMember.photo || "/images/logo.png"}
                      alt={activeJuryMember.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-h-[210px] p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {activeJuryMember.juryType}
                    </p>
                    <h3 className="mt-2 text-4xl font-black leading-tight text-slate-900 dark:text-white">
                      {activeJuryMember.name}
                    </h3>
                    <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {activeJuryMember.functionInJury}
                    </p>
                    <p className="mt-1 truncate text-sm text-slate-600 dark:text-slate-300">{activeJuryMember.email}</p>
                  </div>
                </motion.div>
              ) : (
                <div className="flex min-h-[460px] items-center justify-center p-6 text-sm text-slate-600 dark:text-slate-300">
                  Jury non configure pour le moment.
                </div>
              )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={showPreviousJuryMember}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-400 text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Membre precedent"
              >
                <Icon icon="mdi:chevron-left" className="text-xl" />
              </button>
              <div className="flex items-center gap-2">
                {juryMembers.slice(0, 5).map((member, index) => (
                  <button
                    key={`${member.id}-${index}`}
                    type="button"
                    onClick={() => setActiveJuryIndex(index)}
                    className={`h-3 w-3 rounded-full border ${
                      index === activeJuryIndex
                        ? "border-slate-900 bg-slate-900 dark:border-white dark:bg-white"
                        : "border-slate-400 bg-transparent dark:border-slate-500"
                    }`}
                    aria-label={`Afficher membre ${index + 1}`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={showNextJuryMember}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-400 text-slate-700 transition hover:bg-white dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Membre suivant"
              >
                <Icon icon="mdi:chevron-right" className="text-xl" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="mb-3 border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-darklight">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ressources</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Decouvrir les ressources mises a disposition des etudiants
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
            {resources.map((resource) => (
              <Link
                key={resource.categorySlug}
                href={`/etudes/${resource.categorySlug}/section?section=${section.slug}`}
                className="group relative min-h-[84px] border border-slate-300 bg-white p-4 pr-14 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-darklight"
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center text-slate-700 dark:text-slate-200">
                    <Icon icon={resource.icon} className="text-3xl" />
                  </span>
                  <p className="pr-6 text-lg font-bold leading-tight text-slate-900 dark:text-white">{resource.label}</p>
                </div>
                <span
                  aria-hidden="true"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl font-light leading-none text-slate-900 transition-transform duration-200 group-hover:translate-x-1 dark:text-white"
                >
                  &#8594;
                </span>
              </Link>
            ))}
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5, ease: "easeOut" }}
        className="mb-8"
      >
        <div className="grid gap-4 lg:grid-cols-12">
          <article className="overflow-hidden border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-darklight lg:col-span-4">
            <div className="h-64 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
              <img
                src={chefSection?.photo || "/images/logo.png"}
                alt={chefSection?.name || "Chef de section"}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Chef de section</p>
              <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                {chefSection?.name || "Non renseigne"}
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                {chefSection?.email || "Email indisponible"}
              </p>
              {chefSection?.telephone ? (
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{chefSection.telephone}</p>
              ) : null}
            </div>
          </article>

          <div className="space-y-3 lg:col-span-8">
            <div className="border border-slate-300 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-darklight">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Mission</p>
              <p className="mt-1 text-lg font-bold text-slate-900 dark:text-white">
                Comprendre la mission et les engagements de la faculte
              </p>
            </div>
            {missionItems.map((item, index) => (
              <article
                key={`${section.id}-${item.title}-${index}`}
                className="rounded-sm border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight"
              >
                <h3 className="text-xl font-bold text-blue-950 dark:text-white">{item.title || "Description"}</h3>
                <p className="mt-2 text-sm leading-7 text-slate-700 dark:text-slate-200">
                  {item.content || "Contenu en cours de publication."}
                </p>
              </article>
            ))}
          </div>
        </div>

      </motion.section>

      <SectionContactPanel section={section} />
    </main>
  );
}
