// src/app/dashboard/gestionnaire/page.tsx
import React from "react";
import { notFound } from "next/navigation";

import DashboardGestionnaire from "@/components/dashboard/DashboardGestionnaire";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import UserManager, { AgentWithAuthorizations } from "@/lib/services/UserManager";
import { ChartSerie, loadDashboardDataByRole, Metric } from "@/lib/services/loadDashboardDataByRole";
import { resolveDashboardUi } from "@/lib/dashboard/resolveDashboardUi";
import { resolveGestionnaireScope } from "@/lib/section/resolveGestionnaireScope";

import { mapMongoAuthorizations, mapSessionToDashboardRole } from "../../dashboard/page";
import { DashboardAgentAuthorization, DashboardMetric, DashboardChartSeries } from "@/lib/dashboard/types";

// Server Actions
import { listGestionnaireSessionResourcesAction } from "@/actions/gestionnaireSessionResources";
import { listGestionnaireValidationResourcesAction } from "@/actions/gestionnaireValidationResources";
import { listGestionnaireReleveResourcesAction } from "@/actions/gestionnaireReleveResources";
import { listGestionnaireLaboResourcesAction } from "@/actions/gestionnaireLaboResources";
import { WhiteListItem } from "@/components/secure/PageDashboard";
import { ca } from "date-fns/locale";
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

    // 3. Récupération des ressources en parallèle
    const [sessionsData, validationsData, relevesData, laboratoiresData] = await Promise.all([
      listGestionnaireSessionResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      listGestionnaireValidationResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      listGestionnaireReleveResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" }),
      listGestionnaireLaboResourcesAction({ sectionSlug: scope.sectionSlug, page: 1, limit: 1000, search: "" })
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

    // 5. Structure de Données Globale pour le Graphique Comparatif (Axe X = Les 4 Catégories)
    // Utile pour afficher un BarChart récapitulatif global (Nombre total vs Volumes d'activités/amounts)
    const resourceOverviewChart: ChartSerie = {
      x: categories.map(cat => cat.title.charAt(0).toUpperCase() + cat.title.slice(1)), // ['Sessions', 'Validations', 'Relevés', 'Laboratoires']
      y: categories.map(cat => cat.total),                                             // Quantité totale par type
      y2: categories.map(cat => cat.amount),                                           // Volume financier ou d'activité cumulé
      z: { slug: 'bar', title: 'Aperçu global des activités' }
    };

    const whiteListRessources : {categorie: string, list: WhiteListItem[]}[] = categories.map(cat => ({
      categorie: cat.title,
      list: cat.rows.map(row => ({
        label: row.designation,
        description: row.status || "N/A",
        value: (row.amount ? row.amount.toLocaleString() : "0") + (row?.currency ? ` ${row.currency}` : ""),
        proportion: row.amount ? Math.round((row.amount / (cat.amount || 1)) * 10000) / 100 : 0, // Proportion par rapport au total de la catégorie
        icon: cat.icon,
        url: `/section/modalites/${cat?.title}/${row.id}` // Exemple d'URL, à adapter selon votre routing et les détails disponibles dans `row`
      }))
    }));

    const annees = await AnneeModel.find({}).lean();
    const programmes = await ProgrammeModel
        .find({})
        .populate('section')
        .where('section.slug').equals(scope.sectionSlug)
        .lean();

    console.log("Annees:", annees); // Debug pour vérifier les années récupérées
    console.log("Programmes:", programmes); // Debug pour vérifier les programmes récupérés
    console.log("Dynamic Metrics:", dynamicMetrics); // Debug pour vérifier les métriques générées
    console.log("Resource Overview Chart:", resourceOverviewChart); // Debug pour vérifier les données du graphique
    console.log("WhiteListRessources:", whiteListRessources); // Debug pour vérifier la structure des données

    // 6. Détermination du rôle et des autorisations
    const role = mapSessionToDashboardRole(session);
    let agentAutorizations: DashboardAgentAuthorization[] = [];

    if (session.email) {
      const agent = await UserManager.getUserByEmail("Agent", session.email);
      if (agent && "authorizations" in agent) {
        agentAutorizations = mapMongoAuthorizations(agent as AgentWithAuthorizations);
      }
    }

    // 7. Chargement et fusion des données globales
    const data = await loadDashboardDataByRole(role);
    const userName = session.name || session.email;
    const ui = resolveDashboardUi(role, agentAutorizations);

    const enrichedData = {
      ...data,
      metrics: dynamicMetrics,
      // Vous pouvez injecter ici votre graphique dynamique ou écraser chartData existant
      chartData: [resourceOverviewChart] 
    };

    // 8. Rendu final vers le composant de gestion
    return (
      <DashboardGestionnaire 
        data={enrichedData} 
        userName={userName} 
        ui={ui} 
      />
    );

  } catch (e: any) {
    console.error("Critical error loading gestionnaire dashboard data:", e);
    return notFound();
  }
}