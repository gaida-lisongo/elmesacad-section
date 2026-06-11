import { connectDB } from "@/lib/services/connectedDB";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import EnrollementPaymentWizard from "@/app/(site)/(secure)/section/enrollements/EnrollementPaymentWizard";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";

export default async function QRSessionRessourcePage({ params }: { params: Promise<{ ressourceId: string }> }) {
    const ressourceId = await params.then(p => p.ressourceId);
    console.log("Chargement de la ressource QR session avec ID :", ressourceId);

    try {
      await connectDB();

      const res = await fetchEtudiantApi(`/resources/${ressourceId}`, {
        method: "GET",
      });

      console.log("Réponse de l'API pour la ressource QR session :", res);

      if (!res.ok) {
        throw new Error(`Erreur ${res.status} : ${res.statusText}`);
      }

      const { success, data } = await res.json();
      console.log("Ressource QR session :", data);

      if (!success) {
        throw new Error(`Erreur lors de la récupération de la ressource : ${data.message}`);
      }

      const row : SessionResourceRow = {
        id: data._id,
        designation: data.designation,  
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        brandingSectionRef: data.branding?.sectionSlug || "unknown",
        matieresCount: data?.matieres.length || 0,
        matieresSummary: data?.matieres.map((m: any) => m.designation).join(", ") || "",
      }

      console.log("SessionResourceRow construite :", row);

      return (
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4">Détails de la ressource QR session</h1>
          <EnrollementPaymentWizard
            resourceRow={row}
            sectionSlug={data?.branding?.sectionSlug}
            onDone={() => {console.log("Current Ressource : ", data)}}
            onCancel={() => {console.log("Current Ressource : ", data)}}
          />
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
        </div>
      );
    } catch (e: any) {
      console.error("Erreur lors du chargement de la ressource :", e);
      return <div className="p-4 text-red-500">Erreur lors du chargement de la ressource : {(e as Error).message}</div>;
    }
}