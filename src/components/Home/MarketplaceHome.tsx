"use client";

import { useEffect, useRef, useState } from "react";
import type { PublicHeroActivity } from "@/actions/titulaireActivites";
import type { PublicMetrics } from "@/actions/publicMetrics";
import type { PublicSectionCard } from "@/actions/publicSections";
import type { PublicSeanceCard } from "@/actions/publicSeances";
import MarketplaceFacultySection from "@/components/Home/MarketplaceFacultySection";
import MarketplaceHeroSection from "@/components/Home/MarketplaceHeroSection";
import MarketplaceMetricsPanel from "@/components/Home/MarketplaceMetricsPanel";
import MarketplaceSeances from "@/components/Home/MarketplaceSeances";
import { mockActivitySlides } from "@/components/Home/marketplaceHome.data";

export default function MarketplaceHome({
  heroActivities,
  metrics,
  sections,
  seances,
}: {
  heroActivities?: PublicHeroActivity[];
  metrics: PublicMetrics;
  sections: PublicSectionCard[];
  seances: PublicSeanceCard[];
}) {
  const activitySlides =
    heroActivities && heroActivities.length > 0 ? heroActivities : mockActivitySlides;

  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % activitySlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const goToNextSlide = () => {
    setSlideIndex((current) => (current + 1) % activitySlides.length);
  };

  const goToPrevSlide = () => {
    setSlideIndex((current) => (current - 1 + activitySlides.length) % activitySlides.length);
  };

  const handleTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = event.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const startX = touchStartXRef.current;
    const endX = event.changedTouches[0]?.clientX ?? null;
    touchStartXRef.current = null;
    if (startX === null || endX === null) return;
    const deltaX = endX - startX;
    if (Math.abs(deltaX) < 40) return;
    if (deltaX < 0) goToNextSlide();
    else goToPrevSlide();
  };

  return (
    <main className="bg-[#eef1f7] pb-16 dark:bg-darkmode">
      <div className="w-full bg-white">
        <section className="relative">
          <MarketplaceHeroSection
            activitySlides={activitySlides}
            slideIndex={slideIndex}
            onSelectSlide={setSlideIndex}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          />
          <MarketplaceMetricsPanel metrics={metrics} />
        </section>
        <MarketplaceFacultySection
          sections={sections}
        />
        <MarketplaceSeances seances={seances} />

      </div>
    </main>
  );
}
