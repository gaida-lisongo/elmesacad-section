"use client";

import { Icon } from "@iconify/react/dist/iconify.js";
import { useMemo, useState, useTransition } from "react";
import { submitSectionContactAction } from "@/actions/sectionContact";
import type { PublicSectionCard } from "@/actions/publicSections";

type Props = {
  section: PublicSectionCard;
};

export default function SectionContactPanel({ section }: Props) {
  const members = useMemo(() => section.contactMembers, [section.contactMembers]);
  const [selectedMemberId, setSelectedMemberId] = useState(members[0]?.id ?? "");
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedMember = members.find((member) => member.id === selectedMemberId) ?? members[0];

  const onSubmit = (formData: FormData) => {
    if (!selectedMember?.email) {
      setFeedback({ ok: false, message: "Aucun destinataire valide selectionne." });
      return;
    }

    formData.set("toEmail", selectedMember.email);
    formData.set("toName", selectedMember.name);
    formData.set("sectionName", section.name);

    setFeedback(null);
    startTransition(async () => {
      const result = await submitSectionContactAction(formData);
      setFeedback({ ok: result.ok, message: result.message });
    });
  };

  return (
    <section className="mb-8 grid gap-4 lg:grid-cols-12">
      <div className="border border-slate-300 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight lg:col-span-7">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Contact section</p>
        <h3 className="mt-1 text-3xl font-black text-slate-900 dark:text-white">Espace de contact</h3>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">
          Transmettez votre demande au membre selectionne.
        </p>

        <form action={onSubmit} className="mt-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              type="text"
              name="senderName"
              required
              placeholder="Votre nom complet"
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <input
              type="email"
              name="senderEmail"
              required
              placeholder="Votre email"
              className="h-11 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <input
            type="text"
            name="senderPhone"
            placeholder="Votre contact (telephone)"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <input
            type="text"
            name="subject"
            required
            placeholder="Objet"
            className="h-11 w-full rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <textarea
            name="message"
            required
            placeholder="Redigez votre message..."
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-primary dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700 dark:text-slate-200">
              Annexer un fichier (optionnel)
            </label>
            <input
              type="file"
              name="attachment"
              className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border file:border-slate-300 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold dark:text-slate-200 dark:file:border-slate-600 dark:file:bg-slate-900"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !selectedMember}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-darkprimary disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Envoi..." : "Envoyer le message"}
            </button>
            {feedback ? (
              <p className={`text-sm ${feedback.ok ? "text-emerald-600" : "text-rose-600"}`}>{feedback.message}</p>
            ) : null}
          </div>
        </form>
      </div>

      <aside className="bg-white dark:bg-darklight lg:col-span-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Destinataires</p>
        <h4 className="mt-1 text-xl font-black text-slate-900 dark:text-white">Organisateurs et gestionnaires</h4>
        <div className="mt-4 space-y-2">
          {members.length > 0 ? (
            members.map((member) => (
              <button
                key={`${member.id}-${member.role}`}
                type="button"
                onClick={() => setSelectedMemberId(member.id)}
                className={`flex w-full items-center gap-3 overflow-hidden rounded-lg text-left transition ${
                  selectedMember?.id === member.id
                    ? "ring-1 ring-primary bg-primary/5"
                    : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                }`}
              >
                <div className="ml-2 h-12 w-12 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <img
                    src={member.photo || "/images/logo.png"}
                    alt={member.name}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="min-w-0 py-2 pr-3">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{member.name}</p>
                  <p className="truncate text-xs font-semibold uppercase tracking-wide text-primary">
                    {member.group} - {member.role}
                  </p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">{member.email}</p>
                </div>
              </button>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              Aucun membre organisateur/gestionnaire disponible.
            </p>
          )}
        </div>

        <div className="mt-4 space-y-2 rounded-lg border border-slate-300 bg-slate-50 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
          <p className="flex items-center gap-2">
            <Icon icon="mdi:account-tie-outline" className="text-base text-primary" />
            {selectedMember ? `${selectedMember.name} (${selectedMember.email})` : "Destinataire: N/A"}
          </p>
          <p className="flex items-center gap-2">
            <Icon icon="mdi:email-outline" className="text-base text-primary" />
            {section.email || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <Icon icon="mdi:phone-outline" className="text-base text-primary" />
            {section.telephone || "N/A"}
          </p>
          <p className="flex items-center gap-2">
            <Icon icon="mdi:web" className="text-base text-primary" />
            {section.website || "N/A"}
          </p>
        </div>
      </aside>
    </section>
  );
}
