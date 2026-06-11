import { connectDB } from "@/lib/services/connectedDB";
import { fetchEtudiantApi } from "@/lib/etudiant-service/etudiantRemote";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import SessionClient from "../SessionClient";

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

      if (!success) {
        throw new Error(`Erreur lors de la récupération de la ressource : ${data.message}`);
      }

      return (
        <SessionClient resource={data} />
      );
    } catch (e: any) {
      console.error("Erreur lors du chargement de la ressource :", e);
      return <div className="p-4 text-red-500">Erreur lors du chargement de la ressource : {(e as Error).message}</div>;
    }
}