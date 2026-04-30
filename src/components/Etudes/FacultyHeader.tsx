"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FormEvent, useState } from "react";

type Props = {
  facultyName: string;
  facultyTagline: string;
  sectionSlug: string;
};

export default function FacultyHeader({ facultyName, facultyTagline, sectionSlug }: Props) {
  const [query, setQuery] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-200 dark:border-slate-700">
      <img
        src="/images/inbtp/jpg/img-18.jpg"
        alt="Faculte et etudes"
        className="absolute inset-0 h-full w-full object-cover object-center md:object-[center_20%] lg:object-[center_30%]"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/75 via-slate-900/55 to-slate-900/35 md:via-slate-900/45 md:to-slate-900/20" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative mt-20 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 lg:py-16"
      >
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="text-sm font-semibold uppercase tracking-[0.16em] text-white"
        >
          Section
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.45 }}
          className="mt-3 max-w-3xl text-4xl font-black leading-tight text-white sm:text-5xl"
        >
          {facultyName}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.45 }}
          className="mt-4 max-w-2xl text-base text-white/90"
        >
          {facultyTagline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.45 }}
          className="mt-8 max-w-2xl rounded-xl border border-white/30 bg-white/90 p-3 shadow-sm backdrop-blur-sm dark:bg-slate-900/70"
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Inserez des mots-cles"
              className="h-11 w-full rounded-lg border border-slate-300 px-4 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <button
              type="submit"
              className="inline-flex h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-darkprimary"
            >
              Trouver un cours
            </button>
          </form>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.34, duration: 0.45 }}
          className="mt-4 flex flex-wrap items-center gap-3 text-sm"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href={`/etudes/${sectionSlug}/cours`}
              className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/10 px-3 py-1.5 font-semibold text-white underline decoration-white/80 decoration-2 underline-offset-4 transition hover:bg-white/20"
            >
              Tous les cours
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
            <Link
              href="/etudes"
              className="inline-flex items-center gap-1 rounded-full border border-white/60 bg-white/10 px-3 py-1.5 font-semibold text-white underline decoration-white/80 decoration-2 underline-offset-4 transition hover:bg-white/20"
            >
              Retour aux facultes
              <span aria-hidden="true">-&gt;</span>
            </Link>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
