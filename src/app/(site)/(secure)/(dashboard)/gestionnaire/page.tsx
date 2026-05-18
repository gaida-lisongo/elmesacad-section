// src/app/dashboard/gestionnaire/page.tsx
import React from "react";
import { notFound } from "next/navigation";

import DashboardGestionnaire from "@/components/dashboard/DashboardGestionnaire";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { ChartSerie, Metric, WhiteListItem } from "@/lib/services/loadDashboardDataByRole";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";

// Server Actions
import { listGestionnaireSessionResourcesAction } from "@/actions/gestionnaireSessionResources";
import { listGestionnaireValidationResourcesAction } from "@/actions/gestionnaireValidationResources";
import { listGestionnaireReleveResourcesAction } from "@/actions/gestionnaireReleveResources";
import { listGestionnaireLaboResourcesAction } from "@/actions/gestionnaireLaboResources";
import { AnneeModel } from "@/lib/models/Annee";
import { ProgrammeModel } from "@/lib/models/Programme";

export default async function GestionnaireDashboardPage() {
  try {
    // 1. Vérification de la session
    const session = await getSessionPayload();
    if (!session || session.type !== "Agent" || session.role !== "gestionnaire") {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            Désolé, vous n'avez pas l'autorisation d'accéder à cette page.
          </h1>
        </div>
      );
    }

    // 2. Connexion DB et scope
    await connectDB();
    const scope = await resolveGestionnaireScope(session.sub);
    if (!scope || !scope.sectionSlug) {
      return (
        <div className="flex items-center justify-center h-screen bg-slate-50">
          <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
            Désolé, vous n'avez pas l'autorisation d'accéder à cette page, destinée uniquement au gestionnaire de section.
          </h1>
        </div>
      );
    }

    // 3. Récupération des ressources et des programmes de la section en parallèle
    // OPTIMISATION : On lance la récupération des programmes en même temps pour gagner en performance
    
    // Si votre scope possède l'ID de la section (ex: scope.sectionId ou scope.id), utilisez-le.
    // Sinon, on cherche par rapport au champ `section` s'il est indexé ou via une requête appropriée.
    const queryFilter = scope.sectionId 
      ? { section: scope.sectionId } 
      : {} // Adaptez selon ce que renvoie votre resolveGestionnaireScope

    const [sessionsData, validationsData, relevesData, laboratoiresData, annees, programmes] = await Promise.all([
      listGestionnaireSessionResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      listGestionnaireValidationResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      listGestionnaireReleveResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      listGestionnaireLaboResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      AnneeModel.find({}).lean(),
      // Correction du filtrage Mongoose :
      ProgrammeModel.find(queryFilter).populate('section').lean()
    ]);

    // Calcul des totaux et conservation des références de lignes (rows) pour le graphique
    const categories = [
      { 
        title: 'sessions', 
        amount: sessionsData?.rows ? sessionsData.rows.reduce((sum, row) => sum + (row.amount || 0), 0) : 0, 
        total: sessionsData?.total || 0, 
        icon: 'mdi:account-group', 
        color: 'blue',
        rows: sessionsData?.rows || []
      },
      { 
        title: 'validations', 
        amount: validationsData?.rows ? validationsData.rows.reduce((sum, row) => sum + (row.amount || 0), 0) : 0, 
        total: validationsData?.total || 0, 
        icon: 'mdi:clipboard-check-multiple', 
        color: 'emerald',
        rows: validationsData?.rows || []
      },
      { 
        title: 'releves', 
        amount: relevesData?.rows ? relevesData.rows.reduce((sum, row) => sum + (row.amount || 0), 0) : 0, 
        total: relevesData?.total || 0, 
        icon: 'mdi:file-document-edit', 
        color: 'amber',
        rows: relevesData?.rows || []
      },
      { 
        title: 'laboratoires', 
        amount: laboratoiresData?.rows ? laboratoiresData.rows.reduce((sum, row) => sum + (row.amount || 0), 0) : 0, 
        total: laboratoiresData?.total || 0, 
        icon: 'mdi:flask', 
        color: 'violet',
        rows: laboratoiresData?.rows || []
      }
    ];

    const totalResources = categories.reduce((sum, cat) => sum + cat.total, 0);

    // 4. Génération des métriques dynamiques (DashboardMetric)
    const dynamicMetrics: Metric[] = categories.map((cat) => {
      const value = cat.total;
      const unit = value > 1 ? 'ressources' : 'ressource';
      const rawProportion = totalResources > 0 ? (value / totalResources) * 100 : 0;
      const proportion = Math.round(rawProportion * 100) / 100;

      return {
        title: cat.title.charAt(0).toUpperCase() + cat.title.slice(1),
        value: value.toLocaleString(),
        unit,
        proportion,
        iconName: cat.icon,
        iconColor: cat.color
      };
    });

    // 5. Structure de Données Globale pour le Graphique Comparatif
    const resourceOverviewChart: ChartSerie = {
      x: categories.map(cat => cat.title.charAt(0).toUpperCase() + cat.title.slice(1)), 
      y: categories.map(cat => cat.total),                                             
      y2: categories.map(cat => cat.amount),                                           
      z: { slug: 'bar', title: 'Aperçu global des activités' }
    };

    const whiteListRessources : {categorie: string, list: WhiteListItem[]} = {
      categorie: "Modalités de Paiement",
      list: categories.map((cat: any) => ({
        // WhiteListItem requires a `title` property; use designation or fallback
        title: `${cat.title}`.toUpperCase(),
        label: `${cat.title}`.toUpperCase(),
        description: `Ressource(s) ${cat.total}`,
        value: `${cat.amount} USD`,
        proportion: cat.total ? Math.round((cat.total / (totalResources || 1)) * 10000) / 100 : 0, 
        icon: cat.icon,
        url: `/modalites/${cat?.title}` 
      }))
    };

    // 8. Rendu final vers le composant de gestion
    return (
    <DashboardGestionnaire 
        metrics={dynamicMetrics}
        categories={categories.map(c => (c.title).toString().toLocaleUpperCase())} // Ex: ['SESSIONS', 'VALIDATIONS', 'RELEVES', 'LABORATOIRES']
        chartData={resourceOverviewChart} // Objet direct (conforme au type ChartSerie du client)
        whiteList={whiteListRessources}
        tableData={{ // Double accolades obligatoires pour déclarer un objet en ligne en JSX/TSX
        categories: annees 
            ? annees.map((a: any) => ({
                slug: String(a.slug),
                designation: String(a.designation || `Année ${a.debut}-${a.fin}`),
            })) 
            : [],
        rows: programmes ?? []
        }}
    />
    );

  } catch (e: any) {
    console.error("Critical error loading gestionnaire dashboard data:", e);
    return notFound();
  }
}