import React from "react";
import { Metadata } from "next";
import MarketplaceHome from "@/components/Home/MarketplaceHome";
import { listRecentActivitesPublic } from "@/actions/titulaireActivites";
import { loadPublicMetrics } from "@/actions/publicMetrics";
import { listPublicSections } from "@/actions/publicSections";
import { listRecentSeancesPublic } from "@/actions/publicSeances";

export const metadata: Metadata = {
  title: "INBTP Section | Marketplace Academique",
};

export default async function Home() {
  const [heroActivities, metrics, sections, seances] = await Promise.all([
    listRecentActivitesPublic(6),
    loadPublicMetrics(),
    listPublicSections(),
    listRecentSeancesPublic(6),
  ]);

  return (
    <main className="layout-full-bleed bg-white dark:bg-darkmode">
      <MarketplaceHome heroActivities={heroActivities} metrics={metrics} sections={sections} seances={seances} />
    </main>
  );
}
