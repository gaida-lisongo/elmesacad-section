import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Common/Breadcrumb";
import PaiementResumeClient from "./PaiementResumeClient";

export const metadata: Metadata = {
  title: "Paiement commande | INBTP",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickCommandeId(sp: Record<string, string | string[] | undefined>): string {
  const raw = sp.commandeId ?? sp.commandeid;
  if (typeof raw === "string") return raw.trim();
  if (Array.isArray(raw)) return String(raw[0] ?? "").trim();
  return "";
}

export default async function PaiementPage({ searchParams }: Props) {
  const sp = await searchParams;
  const commandeId = pickCommandeId(sp);
  if (!commandeId) {
    notFound();
  }

  return (
    <>
      <Breadcrumb
        pageName="Reprendre votre commande"
        pageDescription="Vérifiez ou mettez à jour le statut de votre paiement mobile money."
        trail={[{ label: "Études", href: "/etudes" }, { label: "Paiement" }]}
      />
      <main className="min-h-[60vh] bg-slate-50 dark:bg-darkmode">
        <PaiementResumeClient commandeId={commandeId} />
      </main>
    </>
  );
}
