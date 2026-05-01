"use client";

import { useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
type TicketCategorie = "student" | "agent" | "visiteur";

export default function TicketContactForm() {
  const [nomComplet, setNomComplet] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [objet, setObjet] = useState("");
  const [categorie, setCategorie] = useState<TicketCategorie>("visiteur");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [successRef, setSuccessRef] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setSuccessRef(null);
    setLoading(true);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nomComplet,
          email,
          telephone,
          objet,
          categorie,
          message,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        throw new Error(j.message || "Envoi impossible");
      }
      setSuccessRef((j.data?.reference as string) || "");
      setMessage("");
      setObjet("");
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="pb-24 dark:bg-dark">
      <div className="container mx-auto mt-8 max-w-(--breakpoint-xl) px-4 sm:mt-10">
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-darklight">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Workflow</p>
          <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Comment votre demande est traitee</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            Renseignez le formulaire, notre equipe support analyse votre demande puis vous recontacte avec une
            reference de suivi.
          </p>
          <div className="mt-2 grid gap-2 text-sm text-slate-700 dark:text-slate-200 sm:grid-cols-3">
            <p className="flex items-center gap-2">
              <Icon icon="mdi:form-select" className="text-base text-primary" />
              1. Remplissez le formulaire
            </p>
            <p className="flex items-center gap-2">
              <Icon icon="mdi:send-outline" className="text-base text-primary" />
              2. Envoi au support
            </p>
            <p className="flex items-center gap-2">
              <Icon icon="mdi:ticket-confirmation-outline" className="text-base text-primary" />
              3. Reference + suivi ticket
            </p>
          </div>
        </div>

        {successRef ? (
          <div
            className="mb-6 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-200"
            role="status"
          >
            <p className="font-semibold">Message envoye au support (ref. {successRef})</p>
            <p className="mt-1">
              Suivi disponible ici:{" "}
              <a className="underline" href={`/ticket/${encodeURIComponent(successRef)}`}>
                /ticket/{successRef}
              </a>
            </p>
          </div>
        ) : null}
        {err ? (
          <div
            className="mb-6 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-700 dark:bg-rose-900/20 dark:text-rose-200"
            role="alert"
          >
            Echec envoi: {err}
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-darklight lg:col-span-5">
            <img
              src="/images/inbtp/jpg/img-1.jpg"
              alt="Support section"
              onError={(event) => {
                event.currentTarget.src = "/images/contact-page/contact.jpg";
              }}
              className="h-full min-h-[380px] w-full object-cover"
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-darklight lg:col-span-7">
            <h2 className="mb-1 text-3xl font-bold text-midnight_text dark:text-white">Formulaire de contact</h2>
            <p className="mb-5 text-sm text-gray-600 dark:text-gray-400">
              Renseignez vos informations, l&apos;objet et votre message. Une alerte de confirmation apparaitra apres
              l&apos;envoi.
            </p>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tc-name" className="mb-1 block text-sm">
                    Nom complet *
                  </label>
                  <input
                    id="tc-name"
                    required
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base text-midnight_text transition focus:border-primary focus:outline-hidden dark:border-dark_border dark:bg-dark dark:text-white"
                    value={nomComplet}
                    onChange={(e) => setNomComplet(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="tc-email" className="mb-1 block text-sm">
                    E-mail *
                  </label>
                  <input
                    id="tc-email"
                    type="email"
                    required
                    className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base text-midnight_text transition focus:border-primary focus:outline-hidden dark:border-dark_border dark:bg-dark dark:text-white"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label htmlFor="tc-tel" className="mb-1 block text-sm">
                  Téléphone *
                </label>
                <input
                  id="tc-tel"
                  required
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base text-midnight_text transition focus:border-primary focus:outline-hidden dark:border-dark_border dark:bg-dark dark:text-white"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="tc-cat" className="mb-1 block text-sm">
                  Vous êtes
                </label>
                <select
                  id="tc-cat"
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base text-midnight_text dark:border-dark_border dark:bg-dark dark:text-white"
                  value={categorie}
                  onChange={(e) => setCategorie(e.target.value as TicketCategorie)}
                >
                  <option value="visiteur">Visiteur / autre</option>
                  <option value="student">Étudiant</option>
                  <option value="agent">Agent / personnel</option>
                </select>
              </div>
              <div>
                <label htmlFor="tc-obj" className="mb-1 block text-sm">
                  Objet *
                </label>
                <input
                  id="tc-obj"
                  required
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base text-midnight_text transition focus:border-primary focus:outline-hidden dark:border-dark_border dark:bg-dark dark:text-white"
                  value={objet}
                  onChange={(e) => setObjet(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="tc-msg" className="mb-1 block text-sm">
                  Message *
                </label>
                <textarea
                  id="tc-msg"
                  required
                  rows={6}
                  className="w-full rounded-lg border border-border bg-white px-4 py-2.5 text-base text-midnight_text transition focus:border-primary focus:outline-hidden dark:border-dark_border dark:bg-dark dark:text-white"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-gradient-to-r from-primary to-secondary px-8 py-3 font-medium text-white transition hover:opacity-95 disabled:opacity-50"
              >
                {loading ? "Envoi…" : "Envoyer la demande"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
