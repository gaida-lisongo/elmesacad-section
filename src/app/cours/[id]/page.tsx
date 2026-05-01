"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { readCourseFromSession, removeCourseFromSession } from "@/lib/etudes/courseSessionCache";
import type { EtudesCourseSearchItem } from "@/types/etudesCourse";

export default function CourseDetailFromSessionPage() {
  const params = useParams<{ id: string }>();
  const courseId = useMemo(() => String(params?.id ?? "").trim(), [params]);
  const [course, setCourse] = useState<EtudesCourseSearchItem | null>(null);

  useEffect(() => {
    if (!courseId) return;
    const cached = readCourseFromSession(courseId);
    setCourse(cached);

    return () => {
      removeCourseFromSession(courseId);
    };
  }, [courseId]);

  if (!course) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center dark:border-slate-700">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Les donnees du cours ne sont plus disponibles en session.
          </p>
          <Link
            href="/etudes"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkprimary"
          >
            Retourner aux etudes
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <article className="rounded-2xl border border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-darklight">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">{course.programmeDesignation}</p>
        <h1 className="mt-2 text-3xl font-black text-blue-950 dark:text-white">{course.matiereDesignation}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          {course.uniteCode} - {course.uniteDesignation} - {course.semestre}
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="font-semibold">Titulaire:</span> {course.titulaireName || "N/A"}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="font-semibold">Email:</span> {course.titulaireEmail || "N/A"}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="font-semibold">Jour:</span> {course.horaireJour || "N/A"}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="font-semibold">Heure:</span> {course.horaireHeureDebut || "--:--"} -{" "}
            {course.horaireHeureFin || "--:--"}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="font-semibold">Status:</span> {course.status || "N/A"}
          </p>
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800/60">
            <span className="font-semibold">Reference:</span> {course.matiereReference || "N/A"}
          </p>
        </div>

        <div className="mt-6">
          <Link
            href={`/etudes/${course.sectionSlug || ""}`}
            className="inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkprimary"
          >
            Retour a la section
          </Link>
        </div>
      </article>
    </main>
  );
}
