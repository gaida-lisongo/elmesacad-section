"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveCourseInSession } from "@/lib/etudes/courseSessionCache";
import type { PublicSectionCard } from "@/actions/publicSections";
import type { EtudesCourseSearchItem } from "@/types/etudesCourse";

type Props = {
  section: PublicSectionCard;
  query: string;
  courses: EtudesCourseSearchItem[];
  onBackToMain: () => void;
};

export default function SectionCourseSearchView({ section, query, courses, onBackToMain }: Props) {
  const router = useRouter();
  const [selectedProgrammeIds, setSelectedProgrammeIds] = useState<string[]>([]);

  const programmeCounters = useMemo(() => {
    const counters = new Map<string, number>();
    for (const course of courses) {
      counters.set(course.programmeId, (counters.get(course.programmeId) ?? 0) + 1);
    }
    return counters;
  }, [courses]);

  const filteredCourses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const hasProgrammeFilter = selectedProgrammeIds.length > 0;

    return courses.filter((course) => {
      const matchesQuery = normalizedQuery.length === 0 || course.searchText.includes(normalizedQuery);
      const matchesProgramme =
        !hasProgrammeFilter || selectedProgrammeIds.includes(course.programmeId);
      return matchesQuery && matchesProgramme;
    });
  }, [courses, query, selectedProgrammeIds]);

  const toggleProgramme = (programmeId: string) => {
    setSelectedProgrammeIds((prev) =>
      prev.includes(programmeId) ? prev.filter((id) => id !== programmeId) : [...prev, programmeId]
    );
  };

  const openCourseDetail = (course: EtudesCourseSearchItem) => {
    saveCourseInSession(course);
    router.push(`/cours/${course.id}`);
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Recherche locale</p>
          <h2 className="text-2xl font-black text-blue-950 dark:text-white">
            Resultats pour: {query || "Tous les cours"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onBackToMain}
          className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkprimary"
        >
          Retour a la vue principale
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <aside className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-darklight lg:col-span-4">
          <p className="text-sm font-bold text-slate-900 dark:text-white">Programmes ({section.programmes.length})</p>
          <div className="mt-3 space-y-2">
            {section.programmes.map((programme) => (
              <label
                key={programme.id}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedProgrammeIds.includes(programme.id)}
                  onChange={() => toggleProgramme(programme.id)}
                  className="mt-1"
                />
                <span>
                  <span className="font-semibold text-slate-800 dark:text-slate-100">{programme.designation}</span>
                  <span className="ml-1 text-slate-500 dark:text-slate-300">
                    ({programmeCounters.get(programme.id) ?? 0})
                  </span>
                </span>
              </label>
            ))}
          </div>
        </aside>

        <section className="space-y-3 lg:col-span-8">
          {filteredCourses.length > 0 ? (
            filteredCourses.map((course) => (
              <article
                key={course.id}
                className="relative rounded-xl border border-slate-300 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-darklight"
              >
                <div className="absolute left-0 top-0 h-1 w-full rounded-t-xl bg-primary" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {course.programmeDesignation}
                    </p>
                    <h3 className="text-lg font-black text-blue-950 dark:text-white">{course.matiereDesignation}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {course.uniteCode} - {course.uniteDesignation} - {course.semestre}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    {course.status || "no"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                  <p className="rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-800/60">
                    <span className="font-semibold">Titulaire:</span> {course.titulaireName || "N/A"}
                  </p>
                  <p className="rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-800/60">
                    <span className="font-semibold">Email:</span> {course.titulaireEmail || "N/A"}
                  </p>
                  <p className="rounded-md bg-slate-50 px-2 py-1 dark:bg-slate-800/60">
                    <span className="font-semibold">Horaire:</span> {course.horaireJour || "N/A"}{" "}
                    {course.horaireHeureDebut || "--:--"}-{course.horaireHeureFin || "--:--"}
                  </p>
                </div>
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => openCourseDetail(course)}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-black dark:bg-primary dark:hover:bg-darkprimary"
                  >
                    Consulter les details du cours
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Aucun cours trouve pour ces filtres.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
