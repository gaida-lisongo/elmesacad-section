"use client";

import Link from "next/link";
import type { Faculty } from "@/components/Home/marketplaceHome.data";

type Props = {
  faculties: Faculty[];
  activeFaculty: Faculty;
  onSelectFaculty: (facultyId: string) => void;
};

export default function MarketplaceFacultySection({ faculties, activeFaculty, onSelectFaculty }: Props) {
  return (
    <section className="mt-28 rounded-none border-y border-slate-200 bg-transparent p-6 shadow-sm dark:border-slate-700 md:mt-24 md:p-8">
      <h2 className="text-center text-3xl font-bold text-midnight_text dark:text-white">Your Learning, Your Way</h2>
      <div className="mb-5 mt-6 flex flex-wrap justify-center gap-2">
        {faculties.map((faculty) => (
          <button
            key={faculty.id}
            type="button"
            onClick={() => onSelectFaculty(faculty.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              faculty.id === activeFaculty.id
                ? "bg-primary text-white"
                : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {faculty.name}
          </button>
        ))}
      </div>

      <div className={`rounded-2xl bg-gradient-to-r ${activeFaculty.theme} p-1`}>
        <div className="grid gap-5 rounded-[14px] bg-white p-5 dark:bg-darkmode md:grid-cols-2">
          <div>
            <h3 className="text-xl font-bold text-midnight_text dark:text-white">{activeFaculty.name}</h3>
            <p className="mt-2 text-sm text-muted dark:text-white/70">{activeFaculty.description}</p>
            <ul className="mt-4 space-y-2">
              {activeFaculty.highlights.map((line) => (
                <li key={line} className="text-sm text-slate-700 dark:text-slate-200">
                  - {line}
                </li>
              ))}
            </ul>
            <Link
              href="/(site)/(secure)/sections"
              className="mt-5 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-darkprimary"
            >
              Detail faculte
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
            <div className="rounded-xl bg-slate-100 p-4 dark:bg-slate-800" />
          </div>
        </div>
      </div>
    </section>
  );
}
