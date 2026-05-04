import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { hydratePaiementCommande } from "@/lib/paiement/hydratePaiementCommande";
import { resolvePaiementPagePhase } from "@/lib/paiement/resolvePaiementPagePhase";
import PaiementResumeHeader from "./PaiementResumeHeader";
import PaiementVerificationClient from "./PaiementVerificationClient";
import PaiementMetierResumeClient from "./PaiementMetierResumeClient";
import PaiementCompletedClient from "./PaiementCompletedClient";

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

  const hydrated = await hydratePaiementCommande(commandeId);

  if (!hydrated.ok) {
    notFound();
  }

  const { commande, produit, etudiantLocal, produitDetail, produitError } = hydrated.data;

  const phase = resolvePaiementPagePhase(commande.status, commande.ressource?.produit);
  const layoutWide = phase === "metier";

  const breadcrumbDescription =
    phase === "verification"
      ? "Vérification du paiement mobile money (côté serveur). Synchronisez si besoin après validation sur le téléphone."
      : phase === "metier"
        ? "Paiement confirmé : poursuivez la démarche liée à votre commande."
        : phase === "completed"
          ? "Cette commande est déjà clôturée."
          : "État de commande non pris en charge sur cette page.";

  return (
    <>
      <Breadcrumb
        pageName="Reprendre votre commande"
        pageDescription={breadcrumbDescription}
        trail={[{ label: "Études", href: "/etudes" }, { label: "Paiement" }]}
      />
      <main className="min-h-[60vh] bg-slate-50 dark:bg-darkmode">
        <div
          className={`w-full px-4 py-10 sm:px-6 lg:px-10 xl:px-14 ${layoutWide ? "max-w-none" : "mx-auto max-w-lg"}`}
        >
          <PaiementResumeHeader
            variant={phase === "metier" ? "metier" : "default"}
            commandeId={commandeId}
            hydration={hydrated.data}
          />

          {phase === "verification" ? (
            <PaiementVerificationClient commandeId={commandeId} commande={commande} />
          ) : phase === "metier" ? (
            <PaiementMetierResumeClient
              commandeId={commandeId}
              commande={commande}
              produit={produit}
              etudiant={etudiantLocal}
              produitDetail={produitDetail}
              produitError={produitError}
            />
          ) : phase === "completed" ? (
            <PaiementCompletedClient commandeId={commandeId} commande={commande} />
          ) : (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              <p className="font-semibold">Statut inattendu</p>
              <p className="mt-2">
                Statut enregistré : <span className="font-mono">{String(commande.status ?? "—")}</span>
              </p>
              <p className="mt-2 text-xs opacity-90">
                Contactez le support si vous pensez qu&apos;il s&apos;agit d&apos;une erreur.
              </p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
