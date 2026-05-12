"use client";

import type { PaiementCommandeClientPayload, PaiementProduitDetailRecord } from "@/app/paiement/_components/commandeResumePayload";
import PaiementMetierRessourceCore from "@/app/paiement/_components/metier/PaiementMetierRessourceCore";
import { useState } from "react";
import FormLettre from "./FormLetter";
import { OrderStageStudentPayload } from "@/lib/stage/orderStageTypes";
import { submitOrderStageResearchAction } from "@/actions/stageOrderSubmitAction";
import toast from "react-hot-toast";
import Loader from "@/components/Common/Loader";

type Props = {
  commande: PaiementCommandeClientPayload;
  produitDetail: PaiementProduitDetailRecord | null;
  commandeId: string;
  busy?: boolean;
  onRecheck?: () => void;
};

export default function PaiementMetierStagePanel(props: Props) {
  console.log("PaiementMetierStagePanel", props);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(props.commande.status as 'paid' | 'completed' | 'pending' | 'failed' | null);

  const createOrder = async (data: any) => {
    try {
      setLoading(true);
      console.log("createOrder data", data);
      const payload: OrderStageStudentPayload = {
        stageTitle: data.stageTitle,
        recipientName: data.recipientName,
        recipientQuality: data.recipientQuality,
        recipientSex: data.recipientSex,
        companyName: data.companyName,
        companyLocation: data.companyLocation,
        documentReference: data.documentReference,
      };
      const result = await submitOrderStageResearchAction({
        localCommandeId: props.commandeId,
        payload: payload,
      });
      console.log("createOrder result", result);
      if (result.ok) {
        const {
          reference,
        } = result?.microserviceBody as {
          reference: string;
        };
        toast.success("Vottre requette, N/Ref :"+reference+",sera traitee dans les plus brefs delais");
        setStatus('completed');
        // refresh the page
        window.location.reload();
      } else {
        toast.error(result.message || "Erreur lors de la création de la commande");
      }
    } catch (error) {
      console.error("createOrder error", error);
    } finally {
      setLoading(false);
    }
  }

  return loading ? <Loader /> : <FormLettre onSubmit={createOrder} reference={props?.produitDetail?._id as string || ''} stageTitle={props?.produitDetail?.designation as string || ''} />;
}
