"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "@iconify/react/dist/iconify.js";
import type { ProductPageModel } from "@/lib/product/loadProductPageData";
import { formatProductPrice } from "@/lib/product/formatProductPrice";
import {
  commandeProduitFromModel,
  marketplaceCurrency,
  marketplaceLineCategorieFromModel,
  marketplacePayAmount,
  marketplaceProductTitle,
} from "@/lib/product/marketplaceCommandeContext";
import { UserDatabaseSearch } from "@/components/secure/UserDatabaseSearch";
import type { StudentListItem } from "@/lib/services/UserManager";

type Props = {
  model: ProductPageModel;
  categoryLabel: string;
  categoriePath: string;
  /** Masque les boutons « Commander » et ouvre le tiroir checkout au montage (listes ressources section). */
  embedTrigger?: boolean;
};

type CommandeView = {
  id: string;
  status: string;
  transaction?: {
    orderNumber?: string;
    amount?: number;
    currency?: string;
    phoneNumber?: string;
  };
};

function isValidEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

async function postCommande(body: Record<string, unknown>): Promise<{
  ok: boolean;
  status: number;
  payload: Record<string, unknown>;
}> {
  const res = await fetch("/api/resolutions/commande", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, status: res.status, payload };
}

export default function ProductPurchaseBar({
  model,
  categoryLabel,
  categoriePath,
  embedTrigger = false,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const titleId = useId();
  const formId = useId();

  const isActivity = model.kind === "activity";
  const title = isActivity ? model.title : model.designation;
  const priceAmount = marketplacePayAmount(model);
  const priceCurrency = marketplaceCurrency(model);
  const lineCategorie = useMemo(() => marketplaceLineCategorieFromModel(model), [model]);
  const produit = useMemo(() => commandeProduitFromModel(model), [model]);
  const productTitle = useMemo(() => marketplaceProductTitle(model), [model]);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [studentSearchKey, setStudentSearchKey] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [matricule, setMatricule] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [commande, setCommande] = useState<CommandeView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const close = useCallback(() => {
    setDrawerOpen(false);
    setStep(1);
    setError(null);
    setInfo(null);
    setSelectedStudent(null);
  }, []);

  const applyStudentSelection = useCallback((item: StudentListItem) => {
    setSelectedStudent(item);
    setFullName(item.name);
    setEmail(item.email);
    setMatricule(item.matricule);
  }, []);

  const clearStudentSelection = useCallback(() => {
    setSelectedStudent(null);
    setStudentSearchKey((k) => k + 1);
  }, []);

  const metadataPayload = useMemo(() => {
    const base: Record<string, unknown> = {
      fullName: fullName.trim(),
      productTitle,
      categoriePath,
      productId: model.id,
    };
    if (model.kind === "resource") {
      if (model.sectionRefLabel) base.sectionRef = model.sectionRefLabel;
      if (model.programmeFiliereId) base.programme = { filiere: model.programmeFiliereId };
    }
    return base;
  }, [fullName, productTitle, categoriePath, model]);

  useEffect(() => {
    if (!embedTrigger) return;
    setDrawerOpen(true);
    setStep(1);
    setError(null);
    setInfo(null);
    setCommande(null);
    setSelectedStudent(null);
    setStudentSearchKey((k) => k + 1);
  }, [embedTrigger, model.id]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen, close]);

  const goEnsure = async () => {
    setError(null);
    setInfo(null);
    if (!email.trim() || !isValidEmail(email)) {
      setError("Adresse e-mail invalide.");
      return;
    }
    if (!matricule.trim() || matricule.trim().length < 2) {
      setError("Matricule requis.");
      return;
    }
    setBusy(true);
    try {
      const { ok, payload } = await postCommande({
        action: "ensure",
        matricule: matricule.trim(),
        email: email.trim().toLowerCase(),
        categorie: lineCategorie,
        reference: model.id,
        produit,
        metadata: metadataPayload,
      });
      if (!ok || payload.success === false) {
        throw new Error(String(payload.message ?? "Vérification impossible."));
      }
      const exists = Boolean(payload.exists);
      const cmd = payload.commande as Record<string, unknown> | undefined;
      if (exists && cmd && typeof cmd === "object") {
        const id = String(cmd.id ?? "").trim();
        const status = String(cmd.status ?? "").trim();
        setCommande({
          id,
          status,
          transaction: cmd.transaction as CommandeView["transaction"],
        });
        if (status === "paid" || status === "completed") {
          setStep(3);
          setInfo("Un paiement est déjà enregistré pour ce produit avec ces identifiants.");
          return;
        }
        const orderNumber = String((cmd.transaction as Record<string, unknown>)?.orderNumber ?? "").trim();
        if (orderNumber) {
          setPhoneNumber(String((cmd.transaction as Record<string, unknown>)?.phoneNumber ?? phoneNumber));
        }
      } else {
        setCommande(null);
      }
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  };

  const goPay = async () => {
    setError(null);
    setInfo(null);
    if (!phoneNumber.trim() || phoneNumber.replace(/\D/g, "").length < 9) {
      setError("Numéro de téléphone mobile money requis (au moins 9 chiffres).");
      return;
    }
    setBusy(true);
    try {
      const { ok, payload } = await postCommande({
        action: "pay",
        matricule: matricule.trim(),
        email: email.trim().toLowerCase(),
        categorie: lineCategorie,
        reference: model.id,
        produit,
        amount: priceAmount,
        currency: priceCurrency,
        phoneNumber: phoneNumber.trim(),
        metadata: metadataPayload,
      });
      if (!ok || payload.success === false) {
        throw new Error(String(payload.message ?? "Paiement refusé."));
      }
      const existing = Boolean(payload.existing);
      if (existing) {
        const cmd = payload.commande as Record<string, unknown> | undefined;
        if (cmd) {
          setCommande({
            id: String(cmd._id ?? cmd.id ?? ""),
            status: String(cmd.status ?? ""),
            transaction: cmd.transaction as CommandeView["transaction"],
          });
        }
        setInfo(String(payload.message ?? "Commande existante."));
        setStep(3);
        return;
      }
      const cmd = payload.commande as Record<string, unknown> | undefined;
      if (cmd) {
        setCommande({
          id: String(cmd._id ?? cmd.id ?? ""),
          status: String(cmd.status ?? "pending"),
          transaction: cmd.transaction as CommandeView["transaction"],
        });
      }
      setStep(3);
      setInfo(
        "Paiement initié. Validez sur votre téléphone si demandé. Un e-mail avec le lien de reprise vous a été envoyé."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  };

  const goCheck = async () => {
    if (!commande?.id) return;
    setError(null);
    setBusy(true);
    try {
      const { ok, payload } = await postCommande({
        action: "check",
        commandeId: commande.id,
      });
      if (!ok || payload.success === false) {
        throw new Error(String(payload.message ?? "Vérification impossible."));
      }
      const cmd = payload.commande as Record<string, unknown> | undefined;
      if (cmd) {
        setCommande({
          id: String(cmd.id ?? commande.id),
          status: String(cmd.status ?? ""),
          transaction: cmd.transaction as CommandeView["transaction"],
        });
      }
      setInfo(
        String(cmd?.status) === "paid"
          ? "Paiement confirmé."
          : String(cmd?.status) === "pending"
            ? "Paiement encore en attente de confirmation fournisseur."
            : `Statut : ${String(cmd?.status ?? "—")}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur réseau.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {!embedTrigger ? (
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={() => {
              setDrawerOpen(true);
              setStep(1);
              setError(null);
              setInfo(null);
              setCommande(null);
              setSelectedStudent(null);
              setStudentSearchKey((k) => k + 1);
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 text-center text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:bg-darkprimary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex-none sm:min-w-[240px]"
          >
            <Icon icon="solar:cart-large-3-bold-duotone" className="text-xl" aria-hidden />
            Commander
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-midnight_text transition hover:bg-slate-50 dark:border-slate-600 dark:bg-transparent dark:text-white dark:hover:bg-slate-800"
          >
            Continuer les achats
          </Link>
        </div>
      ) : null}

      <AnimatePresence>
        {drawerOpen ? (
          <>
            <motion.button
              type="button"
              aria-label="Fermer le panier"
              className="fixed inset-0 z-[100] bg-slate-950/55 backdrop-blur-[2px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={close}
            />
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className="fixed right-0 top-0 z-[101] flex h-full w-full max-w-md flex-col border-l border-slate-200/80 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
            >
              <header className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Checkout</p>
                  <h2 id={titleId} className="mt-1 text-lg font-bold text-midnight_text dark:text-white">
                    Votre commande
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{categoryLabel}</p>
                </div>
                <button
                  type="button"
                  onClick={close}
                  className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-midnight_text dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <Icon icon="solar:close-circle-bold" className="text-2xl" aria-hidden />
                </button>
              </header>

              <div className="flex shrink-0 gap-1 border-b border-slate-100 px-5 py-3 dark:border-slate-800">
                {([1, 2, 3] as const).map((s) => (
                  <div
                    key={s}
                    className={`h-1 flex-1 rounded-full ${step >= s ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`}
                  />
                ))}
              </div>

              <div className="flex flex-1 flex-col overflow-hidden">
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/90 p-4 dark:border-slate-700 dark:bg-slate-800/50">
                    <div className="flex gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Icon
                          icon={
                            isActivity ? "solar:document-text-bold-duotone" : "solar:box-minimalistic-bold-duotone"
                          }
                          className="text-2xl"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-semibold leading-snug text-midnight_text dark:text-white">
                          {title}
                        </p>
                        <p className="mt-1 text-base font-bold text-primary">
                          {formatProductPrice(priceAmount, priceCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {error ? (
                    <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200">
                      {error}
                    </p>
                  ) : null}
                  {info ? (
                    <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">
                      {info}
                    </p>
                  ) : null}

                  {step === 1 ? (
                    <form
                      id={formId}
                      className="mt-5 space-y-4"
                      onSubmit={(e) => {
                        e.preventDefault();
                        void goEnsure();
                      }}
                    >
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Comme sur la page de connexion, recherchez votre fiche (nom, matricule ou e-mail) pour
                        préremplir vos données, ou saisissez-les manuellement ci-dessous.
                      </p>
                      <div>
                        <p className="mb-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Rechercher dans l&apos;annuaire étudiants
                        </p>
                        <UserDatabaseSearch
                          key={studentSearchKey}
                          kind="student"
                          clearOnSelect
                          listboxAppendToBody
                          onSelect={applyStudentSelection}
                          placeholder="E-mail, nom ou matricule…"
                          showContextBadge
                        />
                      </div>
                      {selectedStudent ? (
                        <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/90 p-4 dark:border-slate-600 dark:from-slate-800 dark:to-slate-900/80">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                Fiche sélectionnée
                              </p>
                              <p className="mt-1 font-bold text-midnight_text dark:text-white">{selectedStudent.name}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-300">{selectedStudent.email}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                Mat. {selectedStudent.matricule}
                                {selectedStudent.cycle ? (
                                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 font-medium text-primary">
                                    {selectedStudent.cycle}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={clearStudentSelection}
                              className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
                            >
                              Changer
                            </button>
                          </div>
                        </div>
                      ) : null}
                      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Coordonnées utilisées pour la commande
                      </p>
                      <div>
                        <label htmlFor={`${formId}-name`} className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Nom complet
                        </label>
                        <input
                          id={`${formId}-name`}
                          autoComplete="name"
                          value={fullName}
                          onChange={(e) => {
                            const v = e.target.value;
                            setFullName(v);
                            if (selectedStudent && v.trim() !== selectedStudent.name.trim()) {
                              setSelectedStudent(null);
                            }
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="Ex. Jean Mukendi"
                        />
                      </div>
                      <div>
                        <label htmlFor={`${formId}-email`} className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          E-mail <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`${formId}-email`}
                          type="email"
                          autoComplete="email"
                          required
                          value={email}
                          onChange={(e) => {
                            const v = e.target.value;
                            setEmail(v);
                            if (selectedStudent && v.trim().toLowerCase() !== selectedStudent.email.toLowerCase()) {
                              setSelectedStudent(null);
                            }
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="vous@exemple.cd"
                        />
                      </div>
                      <div>
                        <label htmlFor={`${formId}-mat`} className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Matricule <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`${formId}-mat`}
                          autoComplete="off"
                          required
                          value={matricule}
                          onChange={(e) => {
                            const v = e.target.value;
                            setMatricule(v);
                            if (selectedStudent && v.trim() !== selectedStudent.matricule.trim()) {
                              setSelectedStudent(null);
                            }
                          }}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="Matricule INBTP"
                        />
                      </div>
                    </form>
                  ) : null}

                  {step === 2 ? (
                    <div className="mt-5 space-y-4">
                      <p className="text-sm text-slate-600 dark:text-slate-300">
                        Numéro <strong>Mobile Money</strong> (M-Pesa, Orange, Airtel…) utilisé pour payer{" "}
                        {formatProductPrice(priceAmount, priceCurrency)}.
                      </p>
                      <div>
                        <label htmlFor={`${formId}-phone`} className="block text-xs font-semibold text-slate-600 dark:text-slate-400">
                          Téléphone <span className="text-red-500">*</span>
                        </label>
                        <input
                          id={`${formId}-phone`}
                          type="tel"
                          autoComplete="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                          placeholder="Ex. 081 234 5678"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep(1)}
                        className="text-sm font-medium text-primary hover:underline"
                      >
                        ← Modifier mes coordonnées
                      </button>
                    </div>
                  ) : null}

                  {step === 3 && commande ? (
                    <div className="mt-5 space-y-3 text-sm text-slate-700 dark:text-slate-200">
                      <p>
                        <span className="font-semibold text-midnight_text dark:text-white">Commande :</span>{" "}
                        <span className="font-mono text-xs">{commande.id}</span>
                      </p>
                      <p>
                        <span className="font-semibold">Statut :</span> {commande.status}
                      </p>
                      {commande.transaction?.orderNumber ? (
                        <p>
                          <span className="font-semibold">N° ordre paiement :</span>{" "}
                          <span className="font-mono">{commande.transaction.orderNumber}</span>
                        </p>
                      ) : null}
                      <Link
                        href={`/paiement?commandeId=${encodeURIComponent(commande.id)}`}
                        className="text-sm font-semibold text-primary hover:underline"
                      >
                        Ouvrir la page paiement / reprise
                      </Link>
                    </div>
                  ) : null}
                </div>

                <footer className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
                  {step === 1 ? (
                    <button
                      type="submit"
                      form={formId}
                      disabled={busy}
                      className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:bg-darkprimary disabled:opacity-60"
                    >
                      {busy ? "Vérification…" : "Continuer vers le paiement"}
                    </button>
                  ) : null}
                  {step === 2 ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void goPay()}
                      className="w-full rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-md shadow-primary/25 hover:bg-darkprimary disabled:opacity-60"
                    >
                      {busy ? "Paiement en cours…" : "Lancer le paiement Mobile Money"}
                    </button>
                  ) : null}
                  {step === 3 ? (
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        disabled={busy || !commande?.id}
                        onClick={() => void goCheck()}
                        className="w-full rounded-xl border border-slate-200 bg-white py-3.5 text-sm font-semibold text-midnight_text hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700 disabled:opacity-60"
                      >
                        {busy ? "Vérification…" : "Rafraîchir le statut paiement"}
                      </button>
                    </div>
                  ) : null}
                  <button
                    type="button"
                    onClick={close}
                    className="mt-3 w-full py-2 text-center text-sm font-medium text-slate-600 hover:text-primary dark:text-slate-400"
                  >
                    Fermer
                  </button>
                </footer>
              </div>
            </motion.aside>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
