"use client";

import Link from "next/link";
import { Icon } from "@iconify/react/dist/iconify.js";
import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { PublicSectionCard } from "@/actions/publicSections";

type Props = {
  sections: PublicSectionCard[];
};

export default function MarketplaceFacultySection({ sections }: Props) {
  const [activeSectionId, setActiveSectionId] = useState(sections[0]?.id ?? "");
  const activeSection = useMemo(
    () => sections.find((item) => item.id === activeSectionId) ?? sections[0],
    [activeSectionId, sections]
  );

  if (!activeSection) {
    return (
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm dark:border-slate-700 dark:bg-darklight">
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Aucune section disponible pour l&apos;instant.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
            Sections
          </p>
          <h2 className="mt-2 text-3xl font-bold text-midnight_text dark:text-white md:text-4xl">
            Decouvre les sections academiques
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 dark:text-slate-300">
            Une presentation claire de chaque section: identite, points forts et equipe de bureau.
          </p>
        </div>

        <div className="mt-8 flex justify-center">
          <div className="flex w-full max-w-full gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-darklight/80">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionId(section.id)}
                className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  section.id === activeSection.id
                    ? "bg-primary text-white shadow-md shadow-primary/30"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </div>

        <motion.article
          key={activeSection.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-darklight"
        >
          <div className="grid lg:grid-cols-12">
            <div className="relative min-h-[420px] lg:col-span-8 lg:min-h-[500px]">
              <img
                src="/images/inbtp/jpg/img-13.jpg"
                alt="Institution INBTP"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/90 via-slate-900/75 to-primary/55" />

              <div className="absolute inset-0 p-6 sm:p-8">
                <div className="flex h-full flex-col justify-between">
                  <div className="space-y-5">
                    <div className="h-20 w-20 overflow-hidden rounded-3xl border border-white/40 bg-white/15 p-1.5 shadow-xl backdrop-blur-sm">
                      <img
                        src={activeSection.logo}
                        alt={`Logo ${activeSection.name}`}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-200">
                        {activeSection.cycle}
                      </p>
                      <h3 className="mt-2 text-3xl font-extrabold leading-tight text-white md:text-4xl">
                        {activeSection.name}
                      </h3>
                    </div>

                    <ul className="grid gap-3 sm:grid-cols-2">
                      {activeSection.descriptionTitles.length > 0 ? (
                        activeSection.descriptionTitles.slice(0, 4).map((title) => (
                          <motion.li
                            key={`${activeSection.id}-${title}`}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white backdrop-blur-sm"
                          >
                            <Icon icon="mdi:check-decagram-outline" className="text-base text-primary-200" />
                            <span className="line-clamp-1">{title}</span>
                          </motion.li>
                        ))
                      ) : (
                        <li className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90 backdrop-blur-sm">
                          Description institutionnelle en cours de publication
                        </li>
                      )}
                    </ul>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
                          <Icon icon="mdi:email-outline" className="text-base" />
                          Email
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold text-white">{activeSection.email}</p>
                      </div>
                      <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
                          <Icon icon="mdi:book-education-outline" className="text-base" />
                          Programmes
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">{activeSection.programmesCount}</p>
                      </div>
                      <div className="rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
                        <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-blue-200">
                          <Icon icon="mdi:account-group-outline" className="text-base" />
                          Bureau
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white">
                          {activeSection.bureauMembers.length} membre(s)
                        </p>
                      </div>
                    </div>

                    <div>
                      <Link
                        href={activeSection.slug ? `/sections/${activeSection.slug}` : "/sections"}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-darkprimary"
                      >
                        Voir le detail
                        <Icon icon="mdi:arrow-right" className="text-base" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <aside className="border-t border-slate-200 bg-slate-50 p-4 text-center dark:border-slate-700 dark:bg-slate-900/40 sm:p-6 lg:col-span-4 lg:border-l lg:border-t-0">
              <div className="flex items-center justify-center gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-300">
                  Bureau de section
                </p>
                <p className="text-xs font-semibold text-primary">
                  {activeSection.bureauMembers.length} membre(s)
                </p>
              </div>

              {activeSection.bureauMembers.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {activeSection.bureauMembers.slice(0, 3).map((member) => (
                    <div
                      key={`${member.id}-${member.role}`}
                      className="mx-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-darklight"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                            {member.name}
                          </p>
                          <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-primary">
                            {member.role}
                          </p>
                        </div>
                        <Link
                          href={member.id ? `/profile/${member.id}` : "#"}
                          className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-darkprimary"
                        >
                          Profil
                        </Link>
                      </div>

                      <div className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                        <div className="flex items-center justify-center gap-2">
                          <Icon icon="mdi:badge-account-outline" className="text-base text-primary" />
                          <p className="truncate">{member.matricule || "N/A"}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Icon icon="mdi:email-outline" className="text-base text-primary" />
                          <p className="truncate">{member.email || "N/A"}</p>
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Icon icon="mdi:phone-outline" className="text-base text-primary" />
                          <p className="truncate">{member.telephone || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-300">
                  Bureau non configure pour le moment.
                </p>
              )}
            </aside>
          </div>
        </motion.article>
      </div>
    </section>
  );
}
