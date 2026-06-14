"use client";

import { useCallback, useState, useTransition } from "react";
import { Icon } from "@iconify/react";
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import type { StudentListItem } from "@/lib/services/UserManager";
import { downloadPdfFromBase64 } from "@/lib/paiement/downloadPdfFromBase64";
import { backofficeMacaronGenerateAction } from "@/actions/backofficeMacaronGenerate";
import { generateMacaronPdfAction } from "@/actions/macaronGenerate";
import {
  buildDocumentMacaronPayload,
} from "@/lib/paiement/sessionEnrollementContext";
import { useRouter } from "next/navigation";

// ─── Helpers ──────────────────────────────────────────────────────

type Step = 1 | 2 | 3;

type WizardViews = {
  /** Commande existante retournée par `ensure` */
  existingCommande?: {
    id: string;
    status: string;
    transaction?: {
      orderNumber?: string;
      amount?: number;
      currency?: string;
      phoneNumber?: string;
    };
  };
  /** Commande fraîchement créée par `manual-pay` */
  createdCommande?: {
    id: string;
    status: string;
  };
  /** Résultat de la génération du macaron */
  macaronResult?: { filename: string; pdfBase64: string };
};

async function postCommande(body: Record<string, unknown>): Promise<{
  ok: boolean;
  payload: Record<string, unknown>;
}> {
  const res = await fetch("/api/resolutions/commande", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  return { ok: res.ok, payload };
}

// ─── Props ────────────────────────────────────────────────────────

type MatiereItem = {
  _id?: string;
  reference?: string;
  designation?: string;
  credit?: number | string;
};

type Props = {
  resourceRow: SessionResourceRow;
  sectionSlug: string;
  type?: "manual" | "student"; // "manual" = paiement enregistré manuellement par le gestionnaire, "student" = paiement effectué par l'étudiant lui-même via le marketplace (différents workflows de création + complétion de la commande)
  /** Matières réelles de la ressource session (pour générer le macaron si l'API étudiant ne répond pas). */
  matieres?: MatiereItem[];
  /** Appelé après succès complet (commande créée + macaron généré) */
  onDone: (data: any) => void;
  /** Annuler / revenir à la liste */
  onCancel: () => void;
};

// ─── Component ────────────────────────────────────────────────────

export default function EnrollementPaymentWizard({
  resourceRow,
  sectionSlug,
  type = "manual",
  matieres: matieresProp,
  onDone,
  onCancel,
}: Props) {
  const [step, setStep] = useState<Step>(1);
  const [wizardViews, setWizardViews] = useState<WizardViews>({});
  const [pending, startTransition] = useTransition();

  // Step 1 state
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [studentSearchKey, setStudentSearchKey] = useState(0);

  // Step 2 state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [orderNumber, setOrderNumber] = useState("");

  // Feedback
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Macaron generation state
  const [generating, setGenerating] = useState(false);

  const router = useRouter();

  // ───── Step 1 : Vérifier existence commande ─────────────────────

  const handleStep1 = useCallback(() => {
    if (!selectedStudent) {
      setError("Veuillez sélectionner un étudiant.");
      return;
    }
    setError(null);
    setInfo(null);

    startTransition(async () => {
      try {
        const { ok, payload } = await postCommande({
          action: "ensure",
          matricule: selectedStudent.matricule,
          email: selectedStudent.email.toLowerCase(),
          categorie: "SESSION",
          reference: resourceRow.id,
          produit: "session",
        });

        if (!ok || payload.success === false) {
          throw new Error(String(payload.message ?? "Vérification impossible."));
        }

        console.log("Réponse de l'API ensure :", payload);

        const exists = Boolean(payload.exists);
        const cmd = payload.commande as Record<string, unknown> | undefined;
        console.log("Vérification commande existante :", { exists, cmd });

        if (exists && cmd && typeof cmd === "object") {
          const status = String(cmd.status ?? "");
          if (status === "paid" || status === "ok" || status === "completed") {
            setWizardViews((prev) => ({
              ...prev,
              existingCommande: {
                id: String(cmd.id ?? ""),
                status,
                transaction: cmd.transaction as {
                  orderNumber?: string;
                  amount?: number;
                  currency?: string;
                  phoneNumber?: string;
                },
              },
            }));
            setInfo("Un paiement est déjà enregistré pour cet étudiant sur cette session.");
            setStep(3);
            return;
          }
        }

        setStep(2);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau.");
      }
    });
  }, [selectedStudent, resourceRow.id]);

  // ───── Step 2 : Création commande paiement manuel ───────────────

  const handleStep2 = useCallback(() => {
    if (!selectedStudent) return;
    const phone = phoneNumber.trim();
    const orderNum = orderNumber.trim();
    if (!phone || phone.replace(/\D/g, "").length < 9) {
      setError("Numéro de téléphone valide requis (au moins 9 chiffres).");
      return;
    }
    if (!orderNum) {
      setError("Numéro de bordereau requis.");
      return;
    }

    setError(null);
    setInfo(null);

    startTransition(async () => {
      try {
        const { ok, payload } = await postCommande({
          action: type === "student" ? "student-pay" : "manual-pay",
          matricule: selectedStudent.matricule,
          email: selectedStudent.email.toLowerCase(),
          categorie: "SESSION",
          reference: resourceRow.id,
          produit: "session",
          amount: resourceRow.amount,
          currency: resourceRow.currency,
          phoneNumber: phone,
          orderNumber: orderNum,
          metadata: {
            fullName: selectedStudent.name,
            productTitle: resourceRow.designation,
          },
        });

        if (!ok || payload.success === false) {
          throw new Error(String(payload.message ?? "Création de la commande échouée."));
        }

        const cmd = payload.commande as Record<string, unknown> | undefined;
        if (!cmd) throw new Error("Réponse invalide.");

        const reqNotify = await fetch('/notify/perception', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commande: cmd }),
        });

        const resNotify = await reqNotify.json()

        if(!resNotify.success) setError("Un problème inattendu est survenu lors de la notification")

        setWizardViews((prev) => ({
          ...prev,
          createdCommande: {
            id: String(cmd.id ?? cmd._id ?? ""),
            status: String(cmd.status ?? "paid"),
          },
        }));

        setInfo("Paiement manuel enregistré avec succès !");
        setStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erreur réseau.");
      }
    });
  }, [selectedStudent, phoneNumber, orderNumber, resourceRow]);

  // ───── Step 3 : Génération du macaron ──────────────────────────

  const commandeId =
    wizardViews.createdCommande?.id ?? wizardViews.existingCommande?.id ?? "";
  
  const generateMacaron = (id: string) => {
    const url = `/paiement?commandeId=${encodeURIComponent(id)}`;
    window.open(url, "_blank");
  };

  const handleGenerateMacaron = useCallback(async () => {
    if (!commandeId) return;
    setGenerating(true);
    setError(null);

    try {
      // Récupérer d'abord les données de la commande pour construire le payload
      const { ok: commandeOk, payload: commandePayload } = await postCommande({
        action: "getById",
        commandeId,
      });

      if (!commandeOk || commandePayload.success === false) {
        throw new Error(String(commandePayload.message ?? "Impossible de récupérer la commande."));
      }

      const commande = commandePayload.commande as Record<string, unknown>;
      if (!commande) throw new Error("Données de commande manquantes.");

      // Récupérer les détails du produit (ressource session) depuis le service étudiant
      let produitDetail: Record<string, unknown> | null = null;
      try {
        // Essayer d'abord via l'API étudiant
        const ressourceRes = await fetch(`/api/etudiant/sections/${encodeURIComponent(sectionSlug)}/ressources/${encodeURIComponent(resourceRow.id)}`, {
          method: "GET",
          cache: "no-store"
        });
        if (ressourceRes.ok) {
          const ressourceJson = await ressourceRes.json();
          produitDetail = (ressourceJson.data ?? ressourceJson) as Record<string, unknown>;
        }
      } catch (e) {
        console.warn("[macaron] Service étudiant non disponible, utilisation des données locales:", e);
        // Fallback : utiliser les données de resourceRow
        produitDetail = {
          _id: resourceRow.id,
          designation: resourceRow.designation,
          amount: resourceRow.amount,
          currency: resourceRow.currency,
          status: resourceRow.status,
          categorie: "SESSION",
        };
      }

      // Fallback minimal si le service étudiant ne répond pas.
      // On ne crée PAS de matières fictives : le microservice /macaron/generate
      // valide que chaque reference de cours est un ObjectId MongoDB valide.
      const fallbackMatieres = (matieresProp || [])
        .map((m) => ({
          reference: m._id || m.reference || "",
          designation: m.designation || "",
          credit: typeof m.credit === "number" ? m.credit : Number(m.credit) || 0,
        }))
        .filter((m) => m.reference && m.reference.match(/^[0-9a-fA-F]{24}$/));

      if (!produitDetail || typeof produitDetail !== "object" || Array.isArray(produitDetail)) {
        produitDetail = {
          _id: resourceRow.id,
          designation: resourceRow.designation,
          amount: resourceRow.amount,
          currency: resourceRow.currency,
          status: "active",
          categorie: "SESSION",
          matieres: fallbackMatieres,
          programme: {
            designation: resourceRow.designation,
            filiere: selectedStudent?.cycle || "Licence",
          },
          annee: {
            slug: "2025-2026",
            debut: "2025",
            fin: "2026",
          },
          branding: {
            institut: "Institut National du Bâtiment et des Travaux Publics",
            section: "Section CIB",
            sectionRef: sectionSlug,
            chef: "Chef de Section",
            contact: "+243 000 000 000",
            email: "section@inbtp.ac.cd",
            adresse: "Kinshasa, République Démocratique du Congo",
          }
        };
      } else if (!Array.isArray((produitDetail as any).matieres)) {
        (produitDetail as any).matieres = fallbackMatieres;
      } else if ((produitDetail as any).matieres.length === 0) {
        (produitDetail as any).matieres = fallbackMatieres;
      }

      //redirection vers /paiement?commandeId=... pour générer le macaron via backofficeMacaronGenerateAction (même workflow que PaiementMetierSessionPanel)
      // generateMacaron(commandeId.toString());
      // Construire le payload du macaron directement (même logique que PaiementMetierSessionPanel)
      onDone({
        commande: commande as Parameters<typeof buildDocumentMacaronPayload>[0]["commande"],
        commandeId,
        etudiant: selectedStudent ? {
          id: selectedStudent.id,
          name: selectedStudent.name,
          email: selectedStudent.email,
          matricule: selectedStudent.matricule,
          sexe: "M", // Valeur par défaut
          telephone: phoneNumber || "",
          photo: selectedStudent.photo || "",
          diplome: selectedStudent.diplome || "",
          cycle: selectedStudent.cycle || "",
          nationalite: "Congolaise",
          ville: "Kinshasa",
          status: "active",
          dateDeNaissance: "1990-01-01",
          lieuDeNaissance: "Kinshasa",
          adresse: "Kinshasa, RDC",
        } : null,
        produitDetail,
      });

    //   // Générer le PDF avec le même workflow que PaiementMetierSessionPanel
    //   const result = await generateMacaronPdfAction(payload);
    //   if (!result.ok) {
    //     setError(result.message);
    //     return;
    //   }

    //   setWizardViews((prev) => ({
    //     ...prev,
    //     macaronResult: {
    //       filename: result.filename,
    //       pdfBase64: result.pdfBase64,
    //     },
    //   }));

    //   downloadPdfFromBase64(result.pdfBase64, result.filename);
    //   setInfo("Macaron généré et téléchargé !");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur lors de la génération.");
    } finally {
      setGenerating(false);
    }
  }, [commandeId, selectedStudent, phoneNumber]);

  // ───── Commande existante → directement step 3 ─────────────────
  //  Si en step 3 sans createdCommande, on vient d'une commande existante
  //  Il faut proposer "Compléter et générer macaron"

  const handleCompleteAndMacaron = useCallback(async () => {
    if (!commandeId) return;
    setGenerating(true);
    setError(null);

    try {
    //   // 1. Compléter la commande (si pas déjà completed)
    //   const { ok, payload } = await postCommande({
    //     action: "complete",
    //     commandeId,
    //   });

    //   if (!ok && payload.success === false) {
    //     // Si déjà completed, ce n'est pas bloquant
    //     if (String(payload.message).includes("Paiement non validé")) {
    //       setError("Le paiement doit être validé avant de compléter.");
    //       setGenerating(false);
    //       return;
    //     }
    //   }

      // 2. Générer le macaron avec le même workflow
      await handleGenerateMacaron();
      return; // handleGenerateMacaron gère déjà l'UI
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur.");
    } finally {
      setGenerating(false);
    }
  }, [commandeId, sectionSlug]);

  // ───── Render ──────────────────────────────────────────────────

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      {/* Steps indicator */}
      <div className="flex justify-center items-center gap-2">
        {([1, 2, 3] as const).map((s) => {
          const active = step >= s;
          const done = step > s;
          return (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                      ? "bg-primary text-white shadow-md"
                      : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {done ? (
                  <Icon icon="solar:check-circle-bold" className="h-4 w-4" />
                ) : (
                  s
                )}
              </div>
              <span
                className={`hidden text-xs font-semibold sm:inline ${
                  active ? "text-gray-900 dark:text-white" : "text-gray-400"
                }`}
              >
                {s === 1
                  ? "Étudiant"
                  : s === 2
                    ? "Paiement"
                    : "Macaron"}
              </span>
              {s < 3 && (
                <div
                  className={`h-px w-6 sm:w-10 ${
                    step > s ? "bg-emerald-400" : "bg-gray-200 dark:bg-gray-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Resource summary */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-white to-primary/[0.04] p-4 dark:border-primary/30 dark:from-gray-900 dark:to-primary/10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon icon="solar:calendar-date-bold-duotone" className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 dark:text-white">
              {resourceRow.designation}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {resourceRow.amount.toLocaleString("fr-FR")} {resourceRow.currency}
              {" · "}
              {resourceRow.matieresCount} programme{resourceRow.matieresCount > 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Error / Info */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-800/50 dark:bg-rose-950/30 dark:text-rose-400">
          <Icon icon="solar:danger-triangle-bold" className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}
      {info && (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-400">
          <Icon icon="solar:check-circle-bold" className="mt-0.5 h-4 w-4 shrink-0" />
          {info}
        </div>
      )}

      {/* ─── Step 1 : Sélection étudiant ─────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Recherchez l&apos;étudiant dans l&apos;annuaire pour vérifier si une commande
            existe déjà pour cette session.
          </p>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Rechercher un étudiant
            </label>
            <UserDatabaseSearch
              key={studentSearchKey}
              kind="student"
              clearOnSelect
              listboxAppendToBody
              onSelect={(item) => {
                setSelectedStudent(item);
              }}
              placeholder="E-mail, nom ou matricule…"
              showContextBadge
            />
          </div>

          {selectedStudent && (
            <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 dark:border-gray-700 dark:from-gray-800 dark:to-gray-900">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Étudiant sélectionné
                  </p>
                  <p className="mt-1 font-bold text-gray-900 dark:text-white">
                    {selectedStudent.name}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {selectedStudent.email}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                      {selectedStudent.matricule}
                    </span>
                    {selectedStudent.cycle && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {selectedStudent.cycle}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleStep1}
              disabled={!selectedStudent || pending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
            >
              {pending ? "Vérification..." : "Continuer"}
              {!pending && <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2 : Paiement manuel ────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <Icon icon="solar:wallet-money-bold-duotone" className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Paiement manuel (Back Office)</p>
                <p className="mt-1 text-xs">
                  Montant à encaisser :{" "}
                  <strong>
                    {resourceRow.amount.toLocaleString("fr-FR")} {resourceRow.currency}
                  </strong>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Numéro de téléphone de l&apos;étudiant
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Ex. 081 234 5678"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600 dark:text-gray-400">
              Numéro de bordereau (orderNumber) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ex. BORD-001-2026"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white dark:placeholder:text-gray-500"
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Saisissez le numéro de bordereau ou de reçu fourni par l&apos;étudiant.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <Icon icon="solar:arrow-left-linear" className="h-4 w-4" />
              Retour
            </button>
            <button
              type="button"
              onClick={handleStep2}
              disabled={pending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-white shadow-md disabled:opacity-50"
            >
              {pending ? (
                "Enregistrement..."
              ) : (
                <>
                  Enregistrer le paiement
                  <Icon icon="solar:arrow-right-linear" className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3 : Macaron ────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Icon icon="solar:check-circle-bold-duotone" className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">
                  {wizardViews.createdCommande
                    ? "Paiement enregistré"
                    : "Commande déjà existante"}
                </p>
                <p className="font-mono text-xs text-gray-500">
                  #{commandeId.slice(-10)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {/* Si pas encore de macaron généré */}
            {!wizardViews.macaronResult && (
              <>
                {wizardViews.createdCommande ? (
                  <button
                    type="button"
                    onClick={handleGenerateMacaron}
                    disabled={generating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Icon
                      icon={generating ? "solar:spinner-bold-duotone" : "solar:gallery-wide-bold-duotone"}
                      className={`h-5 w-5 ${generating ? "animate-spin" : ""}`}
                    />
                    {generating ? "Génération..." : "Générer le macaron"}
                  </button>
                ) : (
                  // Commande existante (déjà paid ou completed)
                  <button
                    type="button"
                    onClick={handleCompleteAndMacaron}
                    disabled={generating}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-primary/90 disabled:opacity-50"
                  >
                    <Icon
                      icon={generating ? "solar:spinner-bold-duotone" : "solar:gallery-wide-bold-duotone"}
                      className={`h-5 w-5 ${generating ? "animate-spin" : ""}`}
                    />
                    {generating
                      ? "Génération..."
                      : "Compléter et générer le macaron"}
                  </button>
                )}
              </>
            )}

            {/* Si macaron déjà généré */}
            {wizardViews.macaronResult && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30">
                <Icon icon="solar:gallery-check-bold-duotone" className="mx-auto h-10 w-10 text-emerald-500" />
                <p className="mt-2 font-semibold text-emerald-800 dark:text-emerald-200">
                  Macaron généré avec succès
                </p>
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                  {wizardViews.macaronResult.filename}
                </p>
                <button
                  type="button"
                  onClick={handleGenerateMacaron}
                  disabled={generating}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:bg-gray-900 dark:text-emerald-300"
                >
                  <Icon icon="solar:refresh-bold-duotone" className="h-3.5 w-3.5" />
                  Regénérer
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            >
              <Icon icon="solar:check-circle-bold-duotone" className="h-5 w-5 text-emerald-500" />
              Terminer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}