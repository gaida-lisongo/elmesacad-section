import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Tableau de bord principal pour accéder à toutes les fonctionnalités et outils de votre compte.",
  keywords: ["dashboard", "tableau de bord", "analytics", "statistiques"],
  authors: [{ name: "Endeavor" }],
  openGraph: {
    title: "Dashboard",
    description: "Tableau de bord principal pour accéder à toutes les fonctionnalités et outils de votre compte.",
    type: "website",
  },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="dashboard-layout">
      {children}
    </div>
  );
}
