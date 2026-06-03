import React from "react";
import { notFound } from "next/navigation";
import { getSessionPayload } from "@/lib/auth/sessionServer";
import { connectDB } from "@/lib/services/connectedDB";
import { getOrganisateurPrimaryBureauSection } from "@/lib/section/getOrganisateurPrimaryBureauSection";
import { ProgrammeModel } from "@/lib/models/Programme";
import { fetchChargesHorairesByPromotionReferencesAction } from "@/actions/chargesHorairesTitulaire";
import DashboardOrganisateur from "@/components/dashboard/DashboardOrganisateur";
import { FiliereModel } from "@/lib/models/Filiere";
import { loadOrganisateurCeChargesHoraires } from "@/lib/dashboard/loadOrganisateurCeChargesHoraires";
import { getSectionRessourcesData } from "@/actions/sectionRessources";
import { loadOrganisateurCrTableData } from "@/lib/dashboard/loadOrganisateurCrTableData";
import { AnneeModel } from "@/lib/models/Annee";

export default async function OrganisateurDashboardPage() {
    try {
        const session = await getSessionPayload();
        if (!session || session.type !== "Agent" || session.role !== "organisateur") {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                        Désolé, vous n'avez pas l'autorisation d'accéder à cette page.
                    </h1>
                </div>
            );
        }

        await connectDB();
        const scope = await getOrganisateurPrimaryBureauSection(session.sub);
        if (!scope || !scope.sectionSlug ) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                        Désolé, vous n'avez pas l'autorisation d'accéder à cette page, destinée uniquement au gestionnaire de section.
                    </h1>
                </div>
            );
        }
        const filieres = await FiliereModel.find().populate('semestres').lean();
        const programmes = await ProgrammeModel.find({ section: scope.sectionId }).lean();
        if (!programmes) {
            return (
                <div className="flex items-center justify-center h-screen bg-slate-50">
                    <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                        Aucune donnée de programme trouvée pour votre section.
                    </h1>
                </div>
            );
        }

        const payload = programmes.map((p) => ({
            slug: String(p.slug ?? "").trim(),
            designation: String(p.designation ?? "").trim(),
            id: String(p._id),
        }));

        const chargesHoraires = await fetchChargesHorairesByPromotionReferencesAction(payload)
        const tableData = [
            {
                role: "Chef de section",
                categories: [
                    {slug: "sessions", title: "Sessions d'examen"},
                    {slug: "validations", title: "Fiche de validation"},
                    {slug: "releves", title: "Relevés de notes"},
                    {slug: "laboratoires", title: "Laboratoires et salles"},
                ],
                items: [
                    {
                        slug: "sessions",
                        data: await getSectionRessourcesData({ sectionSlug: scope.sectionSlug, sectionId: scope.sectionId, categorie: "session" }),
                    },
                    {
                        slug: "validations",
                        data: await getSectionRessourcesData({ sectionSlug: scope.sectionSlug, sectionId: scope.sectionId, categorie: "validation" }),
                    },
                    {
                        slug: "releves",
                        data: await getSectionRessourcesData({ sectionSlug: scope.sectionSlug, sectionId: scope.sectionId, categorie: "releve" }),
                    },
                    {
                        slug: "laboratoires",
                        data: await getSectionRessourcesData({ sectionSlug: scope.sectionSlug, sectionId: scope.sectionId, categorie: "laboratoire" }),
                    }
                ]
            },
            {
                role: "Chargé d'enseignement",
                categories: [
                    {
                        slug: session?.sub,
                        title: "Gestion des charges horaires",
                    }
                ],
                items: [
                    {
                        slug: session?.sub,
                        data: await loadOrganisateurCeChargesHoraires(session.sub),
                    }
                ]
            }
        ];

        const enseignementTable = tableData.find(t => t.role === "Chargé d'enseignement" && scope.isChargeEnseignement)
        const sectionTable = tableData.find(t => t.role === "Chef de section" && scope.isChefSection)
        const resolvedTableData = [sectionTable, enseignementTable].filter(Boolean);


        let chargeRechercheData = undefined;
        if (scope.isChargeRecherche || scope.isChefSection) {
            chargeRechercheData = await loadOrganisateurCrTableData(scope.sectionId, scope.sectionSlug);
        }

        // Année active pour les parcours (secrétaire)
        const activeAnnee = await AnneeModel.findOne({ status: true }).select("_id designation slug").lean();
        const anneeActive = activeAnnee
            ? {
                  id: String(activeAnnee._id),
                  designation: String((activeAnnee as { designation?: string }).designation ?? ""),
                  slug: String((activeAnnee as { slug?: string }).slug ?? ""),
              }
            : null;

        return <DashboardOrganisateur
            section={{
                id: scope.sectionId,
                slug: scope.sectionSlug,
                designation: scope.sectionDesignation,
                isChefSection: scope.isChefSection,
                isChargeEnseignement: scope.isChargeEnseignement,
                isChargeRecherche: scope.isChargeRecherche,
                isSecretaire: scope.isSecretaire,
            }}
            programmes={programmes}
            chargesHoraires={chargesHoraires}
            filieres={filieres}
            tableData={resolvedTableData}
            chargeRechercheData={chargeRechercheData}
            anneeActive={anneeActive}
        />;
    } catch (error) {
        console.error("Error loading Organisateur dashboard:", error);
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50">
                <h1 className="text-xl font-bold text-slate-800 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
                    Désolé, une erreur est survenue lors du chargement du tableau de bord.
                </h1>
            </div>
        );
    }

}