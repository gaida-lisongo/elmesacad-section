import React from "react";
import { Metadata } from "next";
import MarketplaceHome from "@/components/Home/MarketplaceHome";
import { listRecentActivitesPublic } from "@/actions/titulaireActivites";
import { loadPublicMetrics } from "@/actions/publicMetrics";
import { listPublicSections } from "@/actions/publicSections";

export const metadata: Metadata = {
  title: "INBTP Section | Marketplace Academique",
};

export default async function Home() {
  const [heroActivities, metrics, sections] = await Promise.all([
    listRecentActivitesPublic(6),
    loadPublicMetrics(),
    listPublicSections(),
  ]);

  return (
    <main className="layout-full-bleed bg-white dark:bg-darkmode">
      <MarketplaceHome heroActivities={heroActivities} metrics={metrics} sections={sections} />
    </main>
  );
}
