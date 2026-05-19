'use client';

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
}

export default function DashboardOrganisateur(props: DashboardOrganisateurProps) {

    const { section, programmes, chargesHoraires } = props;
    console.log("Section :", section);
    console.log("Programmes :", programmes);
    console.log("Charges Horaires :", chargesHoraires);

    const categories : {
        title: string;
        amount: number;
        total: number;
        icon: string;
        color: string;
        rows: any[];
    }[] = !chargesHoraires ? [] : chargesHoraires.items.map((charge: any) => ({
        title: `${charge.programmeDesignation}`,
        amount: (programmes.find((p) => String(p.slug) === String(charge.programmeSlug))?.credits || 0) * 25,
        total: charge?.count,
        icon: "mdi:school", //SchoolIcon,
        color: "blue",
        rows: charge?.items || [],
    }));

    const totalCharges = categories.reduce((sum, category) => sum + category.total, 0);
    const totalVolumeHoraire = categories.reduce((sum, category) => sum + category.amount, 0);

    console.log("Categories :", categories);
    console.log("Total Charges :", totalCharges);
    console.log("Total Volume Horaire :", totalVolumeHoraire);
    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold mb-4">Dashboard Organisateur</h1>
            <p className="mb-2">Section: {section.designation} (Slug: {section.slug})</p>
            <p className="mb-4">
                Rôles:{" "}
                {section.isChefSection && "Chef de Section "}
                {section.isChargeEnseignement && "Chargé d'Enseignement "}
                {section.isChargeRecherche && "Chargé de Recherche"}
            </p>
            <h2 className="text-xl font-semibold mb-3">Programmes</h2>
            <ul className="list-disc list-inside mb-4">
                {programmes.map((programme) => (
                    <li key={programme.id}>
                        {programme.designation} (Slug: {programme.slug})
                    </li>
                ))}
            </ul>
            <h2 className="text-xl font-semibold mb-3">Charges Horaires</h2>
            <ul className="list-disc list-inside">
                {chargesHoraires && chargesHoraires?.items?.map((charge: any) => (
                    <li key={charge.id}>
                        Programme: {charge.programmeSlug}, Volume Horaire: {charge.status} H
                    </li>
                ))}
            </ul>
        </div>
    );

}