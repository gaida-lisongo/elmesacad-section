import { connectDB } from "@/lib/services/connectedDB";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";

export default async function QRSessionRessourcePage({ params }: { params: Promise<{ ressourceId: string }> }) {
    const ressourceId = await params.then(p => p.ressourceId);
    console.log("Chargement de la ressource QR session avec ID :", ressourceId);

    try {
      await connectDB();

      const res = await fetchEtudiantApi(`/ressources/${ressourceId}`, {
        method: "GET",
      });

      if (!res.ok) {
        throw new Error(`Erreur ${res.status} : ${res.statusText}`);
      }

      const data = await res.json();
      console.log("Ressource QR session :", data);

      return (
        <div className="p-4">
          <h1 className="text-xl font-bold mb-4">Détails de la ressource QR session</h1>
          <pre className="bg-gray-100 p-4 rounded">{JSON.stringify(data, null, 2)}</pre>
        </div>
      );
    } catch (e: any) {
      console.error("Erreur lors du chargement de la ressource :", e);
      return <div className="p-4 text-red-500">Erreur lors du chargement de la ressource : {(e as Error).message}</div>;
    }
}