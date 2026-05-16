import FraisClient from "./FraisClient";

export default async function FraisPage() {
    const req = await fetch('/api/annee', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!req.ok) {
        throw new Error('Failed to fetch annees');
    }

    const { data: annees } = await req.json() as { data: { _id: string; designation: string; debut: number; fin: number; slug: string; status: boolean }[] };

    if (annees.length === 0) {
        return (
            <div className="p-4">
                <h1 className="text-2xl font-bold mb-4">Frais</h1>
                <p>Aucune année académique trouvée. Veuillez en créer une pour gérer les frais.</p>
            </div>
        );
    }

    const reqFrais = await fetch('/api/frais?annee=' + annees[0]._id, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const { data: frais } = await reqFrais.json() as { data: any[] };

    const tabs = annees.map((annee) => ({
        label: annee.designation,
        value: annee.slug,
    }));

    return (
        <FraisClient
            initialData={frais}
            tabs={tabs}
        />
    );

}