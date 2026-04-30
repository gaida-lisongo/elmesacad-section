"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import type { TouchEvent } from "react";
import type { ActivitySlide } from "@/components/Home/marketplaceHome.data";

type Props = {
  activitySlides: ActivitySlide[];
  slideIndex: number;
  onSelectSlide: (index: number) => void;
  onTouchStart: (event: TouchEvent<HTMLDivElement>) => void;
  onTouchEnd: (event: TouchEvent<HTMLDivElement>) => void;
};

export default function MarketplaceHeroSection({
  activitySlides,
  slideIndex,
  onSelectSlide,
  onTouchStart,
  onTouchEnd,
}: Props) {
  const currentSlide = activitySlides[slideIndex];
  const publishedLabel = currentSlide.publishedAt
    ? new Date(currentSlide.publishedAt).toLocaleDateString("fr-FR")
    : "N/A";

  return (
    <div
      className="relative min-h-[74vh] overflow-hidden rounded-none bg-slate-900 shadow-sm"
      style={{ backgroundImage: "url('/images/inbtp/jpeg/img-3.jpeg')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 bg-black/78" />
      <div
        className="relative grid min-h-[80vh] place-items-center px-6 pb-8 pt-24 md:px-12 md:pb-10 md:pt-28"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -24 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full max-w-4xl space-y-5 text-center"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/75">
              Date de publication: {publishedLabel}
            </p>
            <h1 className="text-3xl font-bold leading-tight text-white md:text-5xl">{currentSlide.matiere}</h1>
            <p className="mx-auto max-w-2xl text-sm text-white/85 md:text-base">{currentSlide.summary}</p>

            <div className="mx-auto grid max-w-2xl gap-3 text-sm md:grid-cols-2">
              <p className="rounded-lg bg-white/10 px-4 py-2 text-white/95 backdrop-blur-sm">
                <span className="font-semibold">Titulaire :</span> {currentSlide.teacher}
              </p>
              <p className="rounded-lg bg-white/10 px-4 py-2 text-white/95 backdrop-blur-sm">
                <span className="font-semibold">Unite d'enseignement :</span> {currentSlide.unite}
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <Link
                href={`/student/${currentSlide.categorie}?activiteId=${encodeURIComponent(currentSlide.id)}`}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-darkprimary"
              >
                Voir le detail de l'activite
              </Link>
              <Link
                href={`/charge_horaire/${encodeURIComponent(currentSlide.chargeHoraireId || "")}`}
                className="rounded-md bg-white/90 px-5 py-2.5 text-sm font-semibold text-slate-900 hover:bg-white"
              >
                Detail charge horaire
              </Link>
            </div>

            <div className="flex justify-center gap-2 pt-2">
              {activitySlides.map((slide, idx) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => onSelectSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  className={`h-2.5 w-8 rounded-full ${idx === slideIndex ? "bg-white" : "bg-white/35"}`}
                />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
