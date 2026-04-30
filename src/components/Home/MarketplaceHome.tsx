"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicHeroActivity } from "@/actions/titulaireActivites";
import type { PublicMetrics } from "@/actions/publicMetrics";
import MarketplaceFacultySection from "@/components/Home/MarketplaceFacultySection";
import MarketplaceHeroSection from "@/components/Home/MarketplaceHeroSection";
import MarketplaceHowItWorksSection from "@/components/Home/MarketplaceHowItWorksSection";
import MarketplaceMetricsPanel from "@/components/Home/MarketplaceMetricsPanel";
import { faculties, howItWorks, mockActivitySlides } from "@/components/Home/marketplaceHome.data";

export default function MarketplaceHome({
  heroActivities,
  metrics,
}: {
  heroActivities?: PublicHeroActivity[];
  metrics: PublicMetrics;
}) {
  const activitySlides =
    heroActivities && heroActivities.length > 0 ? heroActivities : mockActivitySlides;

  const [slideIndex, setSlideIndex] = useState(0);
  const [facultyTab, setFacultyTab] = useState(faculties[0]?.id ?? "");
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setSlideIndex((current) => (current + 1) % activitySlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const activeFaculty = useMemo(
    () => faculties.find((item) => item.id === facultyTab) ?? faculties[0],
    [facultyTab]
  );

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
          faculties={faculties}
          activeFaculty={activeFaculty}
          onSelectFaculty={setFacultyTab}
        />
        <MarketplaceHowItWorksSection howItWorks={howItWorks} />

      </div>
    </main>
  );
}
