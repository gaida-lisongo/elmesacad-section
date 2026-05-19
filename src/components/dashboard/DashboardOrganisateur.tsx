'use client';

import { ChartSerie, Metric } from "@/lib/services/loadDashboardDataByRole";
import { label } from "framer-motion/m";
import DashboardPage from "./Dashboard";

interface DashboardOrganisateurProps {
    section: {
        id: string;
        slug: string;
        designation: string;
        isChefSection: boolean;
        isChargeEnseignement: boolean;
        isChargeRecherche: boolean;
    };
    programmes: any[];
    chargesHoraires: any;
    filieres: any[];
}

export default function DashboardOrganisateur(props: DashboardOrganisateurProps) {

    const { section, programmes, chargesHoraires, filieres } = props;
    console.log("Section :", section);
    console.log("Programmes :", programmes);
    console.log("Charges Horaires :", chargesHoraires);
    console.log("Filières :", filieres);

    const categories : {
        title: string;
        amount: number;
        total: number;
        icon: string;
        color: string;
        rows: any[];
    }[] = !chargesHoraires?.ok ? [] : chargesHoraires?.data.map((charge: any) => ({
        title: `${charge.programmeDesignation}`,
        amount: !charge?.items ? 0 : charge.items.reduce((sum: number, item: any) => sum + (item.status == 'finish' ? 1 : 0), 0),  
        total: charge?.count,
        icon: "mdi:school", //SchoolIcon,
        color: "blue",
        rows: charge?.items || [],
    }));

    const totalCharges = categories.reduce((sum, category) => sum + category.total, 0);
    const totalVolumeHoraire = categories.reduce((sum, category) => sum + category.amount, 0);
    const totalPendingCharges = categories.reduce((sum, category) => sum + (category?.rows.reduce((pending, row) => pending + (row.status == 'pending' ? 1 : 0), 0)), 0);
    const totalNoCharges = categories.reduce((sum, category) => sum + (category?.rows.reduce((noCharge, row) => noCharge + (row.status == 'no' ? 1 : 0), 0)), 0);
    const maxCreditsProgrammes = 60 * programmes.length; // Hypothèse : chaque programme peut avoir jusqu'à 60 crédits

    console.log("Categories :", categories);
    console.log("Total Charges :", totalCharges);
    console.log("Total Volume Horaire :", totalVolumeHoraire);

    const dynamicMetrics: Metric[] = [
        {
            title: 'Programmes',
            value: programmes.reduce((sum, p) => sum + (p.credits || 0), 0).toLocaleString(),
            unit: 'Crd',
            proportion: maxCreditsProgrammes > 0 ? Math.round((programmes.reduce((sum, p) => sum + (p.credits || 0), 0) / maxCreditsProgrammes) * 10000) / 100 : 0,
            iconName: 'mdi:school',
            iconColor: 'blue',
        },
        {
            title: 'Cours terminées',
            value: totalVolumeHoraire.toLocaleString(),
            unit: 'H',
            proportion: totalCharges > 0 ? Math.round((totalVolumeHoraire / (totalCharges * 1)) * 10000) / 100 : 0, // Hypothèse : chaque charge représente 1 heure
            iconName: 'mdi:check-circle',
            iconColor: 'green',
        },
        {
            title: 'Cours en attente',
            value: totalPendingCharges.toLocaleString(),
            unit: 'H',
            proportion: totalCharges > 0 ? Math.round((totalPendingCharges / (totalCharges * 1)) * 10000) / 100 : 0,
            iconName: 'mdi:clock',
            iconColor: 'orange',
        },
        {
            title: 'Cours non debutés',
            value: totalNoCharges.toLocaleString(),
            unit: 'H',
            proportion: totalCharges > 0 ? Math.round((totalNoCharges / (totalCharges * 1)) * 10000) / 100 : 0,
            iconName: 'mdi:close-circle',
            iconColor: 'red',
        }
    ];

    const chargesOverviewChart : ChartSerie = {
        x: categories.map(cat => cat.title),
        y: categories.map(cat => cat.amount),
        y2: categories.map(cat => cat.total),
        z: { slug: 'bar', title: 'Aperçu des charges horaires par programme' }
    }

    const totalCrdFilieres = [...filieres?.map((filiere: any) => filiere.semestres?.reduce((sum: number, semestre: any) => sum + (semestre.credits || 0), 0) || 0)].reduce((sum, crd) => sum + crd, 0);

    const whiteListFilieres = {
        categorie: 'Gestion des filières',
        list: filieres.map((filiere: any) => ({
            title: filiere.designation,
            label: filiere.slug,
            description: `Configurer la filière`, //50 premières caractères de la description de la filière
            value: `${filiere.semestres?.length || 0} semestre(s)`,
            proportion: totalCrdFilieres > 0 ? Math.round((filiere.semestres?.reduce((sum: number, semestre: any) => sum + (semestre.credits || 0), 0) || 0) / totalCrdFilieres * 10000) / 100 : 0,
            icon: 'mdi:format-list-bulleted',
            url: `/filiere/${filiere.slug}`
        }))
    };
      
    return (
        <DashboardPage 
            initialData={{
                metrics: dynamicMetrics,
                categories: categories.map(cat => cat.title),
                chartData: [chargesOverviewChart],
                whiteList: whiteListFilieres,
            }}
        >
            {/* Ici, on pourrait injecter une table personnalisée (TableData) configurée pour les programmes ou les filières */}
            <ul className="mt-6 space-y-4">
                {
                    [
                        { status: section.isChefSection, label: "Chef de section" },
                        { status: section.isChargeEnseignement, label: "Chargé d'enseignement" },
                        { status: section.isChargeRecherche, label: "Chargé de recherche" },
                    ].map((role, idx) => (
                        <li key={idx} className={`px-4 py-2 rounded-md text-sm font-medium ${role.status ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                            {role.label}
                        </li>
                    ))
                }
            </ul>
        </DashboardPage>
    );

}