"use client";

import { useState } from "react";
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
    <section className="dark:bg-dark pb-24">
      <div className="container mx-auto max-w-3xl px-4">
        <h2 className="mb-6 text-3xl font-bold text-midnight_text dark:text-white">Contact & support</h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Décrivez votre demande. Vous recevrez un accusé de réception avec un lien pour suivre la
          conversation avec l’équipe.
        </p>
        {successRef && (
          <div
            className="mb-6 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-midnight_text dark:text-white"
            role="status"
          >
            <p className="font-medium">Demande enregistrée (réf. {successRef})</p>
            <p className="mt-1 text-gray-600 dark:text-gray-400">
              Vérifiez votre boîte e-mail. Vous pourrez reprendre l’échange ici :{" "}
              <a className="text-primary underline" href={`/ticket/${encodeURIComponent(successRef)}`}>
                /ticket/{successRef}
              </a>
            </p>
          </div>
        )}
        {err && (
          <p className="mb-4 text-sm text-red-600" role="alert">
            {err}
          </p>
        )}
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
    </section>
  );
}
