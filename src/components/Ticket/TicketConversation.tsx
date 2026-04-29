"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ChatMsg = {
  id: string;
  author: boolean;
  message: string;
  createdAt: string;
};

type PublicPayload = {
  reference: string;
  objet: string;
  status: string;
  nomComplet: string;
  chats: ChatMsg[];
  createdAt?: string;
  updatedAt: string;
};

type AdminPayload = PublicPayload & {
  id: string;
  email: string;
  telephone: string;
  message: string;
  categorie: string;
};

const CATEGORIE_LABEL: Record<string, string> = {
  student: "Étudiant",
  agent: "Agent / personnel",
  visiteur: "Visiteur",
};

const STATUS_LABEL: Record<string, string> = {
  pending: "En attente",
  en_cours: "En cours",
  resolu: "Résolu",
  ferme: "Fermé",
};

function MessageBubble({ m, isAgentView }: { m: ChatMsg; isAgentView: boolean }) {
  const fromClient = m.author;
  const alignRight = isAgentView ? !fromClient : fromClient;
  return (
    <div className={`mb-3 flex ${alignRight ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
          fromClient
            ? "bg-primary/15 text-midnight_text dark:bg-primary/20 dark:text-white"
            : "bg-gray-200 text-midnight_text dark:bg-gray-700 dark:text-white"
        }`}
      >
        <p className="whitespace-pre-wrap">{m.message}</p>
        <p className="mt-1 text-[10px] opacity-70">
          {fromClient ? "Vous" : "Support"} ·{" "}
          {new Date(m.createdAt).toLocaleString("fr-FR", {
            dateStyle: "short",
            timeStyle: "short",
          })}
        </p>
      </div>
    </div>
  );
}

export function PublicTicketConversation({ reference }: { reference: string }) {
  const [data, setData] = useState<PublicPayload | null>(null);
  const [email, setEmail] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastIso = useRef<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets/public/${encodeURIComponent(reference)}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j.message);
    setData(j.data);
    const chats = j.data.chats as ChatMsg[];
    const last = chats[chats.length - 1];
    if (last) lastIso.current = last.createdAt;
  }, [reference]);

  useEffect(() => {
    void load().catch((e) => setErr((e as Error).message)).finally(() => setLoading(false));
  }, [load]);

  const poll = useCallback(async () => {
    const since = lastIso.current ?? new Date(0).toISOString();
    const res = await fetch(
      `/api/tickets/public/${encodeURIComponent(reference)}/poll?since=${encodeURIComponent(since)}`
    );
    const j = await res.json();
    if (!res.ok) return;
    const newMsgs = j.data?.newMessages as ChatMsg[] | undefined;
    if (newMsgs?.length) {
      setData((prev) => {
        if (!prev) return prev;
        const byId = new Set(prev.chats.map((c) => c.id));
        const merged = [...prev.chats];
        for (const m of newMsgs) {
          if (!byId.has(m.id)) {
            merged.push(m);
            byId.add(m.id);
          }
        }
        merged.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const last = merged[merged.length - 1];
        if (last) lastIso.current = last.createdAt;
        return { ...prev, chats: merged, status: j.data.status, updatedAt: j.data.updatedAt };
      });
    }
  }, [reference]);

  useEffect(() => {
    const t = setInterval(() => {
      void poll();
    }, 4000);
    return () => clearInterval(t);
  }, [poll]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !body.trim()) return;
    setErr(null);
    const res = await fetch(`/api/tickets/public/${encodeURIComponent(reference)}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), message: body.trim() }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.message || "Envoi impossible");
      return;
    }
    setData(j.data);
    setBody("");
    const chats = j.data.chats as ChatMsg[];
    const last = chats[chats.length - 1];
    if (last) lastIso.current = last.createdAt;
  };

  if (loading) {
    return <p className="p-6 text-sm text-gray-500">Chargement…</p>;
  }
  if (err && !data) {
    return <p className="p-6 text-sm text-red-600">{err}</p>;
  }
  if (!data) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-white/80 p-3 text-sm dark:border-dark_border dark:bg-gray-900/80">
        <p>
          <span className="font-medium">Réf. {data.reference}</span> — {data.objet}
        </p>
        <p className="text-xs text-gray-500">Statut : {data.status}</p>
      </div>
      <div className="min-h-[200px] rounded-xl border border-border bg-grey/30 p-3 dark:border-dark_border dark:bg-dark/40">
        {data.chats.map((m) => (
          <MessageBubble key={m.id} m={m} isAgentView={false} />
        ))}
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <form onSubmit={send} className="space-y-2">
        <p className="text-xs text-gray-500">
          Pour écrire, saisissez l’e-mail utilisé à l’ouverture du ticket.
        </p>
        <input
          type="email"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-dark_border dark:bg-dark"
          placeholder="E-mail de la demande"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <textarea
          className="w-full rounded-lg border border-border px-3 py-2 text-sm dark:border-dark_border dark:bg-dark"
          rows={3}
          placeholder="Votre message"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}

export function AgentTicketConversation({ ticketId }: { ticketId: string }) {
  const [data, setData] = useState<AdminPayload | null>(null);
  const [body, setBody] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const load = useCallback(async () => {
    const res = await fetch(`/api/tickets/${ticketId}`);
    const j = await res.json();
    if (!res.ok) throw new Error(j.message);
    setData(j.data);
    setStatus(j.data.status);
  }, [ticketId]);

  useEffect(() => {
    void load().catch((e) => setErr((e as Error).message));
  }, [load]);

  useEffect(() => {
    const t = setInterval(() => {
      void load().catch(() => undefined);
    }, 5000);
    return () => clearInterval(t);
  }, [load]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    setErr(null);
    const res = await fetch(`/api/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: body.trim() }),
    });
    const j = await res.json();
    if (!res.ok) {
      setErr(j.message || "Envoi impossible");
      return;
    }
    setData(j.data);
    setStatus(j.data.status);
    setBody("");
  };

  const saveStatus = async (s: string) => {
    const res = await fetch(`/api/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: s }),
    });
    const j = await res.json();
    if (res.ok) {
      setData(j.data);
      setStatus(s);
    }
  };

  if (err && !data) {
    return <p className="p-6 text-sm text-red-600">{err}</p>;
  }
  if (!data) {
    return <p className="p-6 text-sm text-gray-500">Chargement…</p>;
  }

  return (
    <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
      <aside className="w-full shrink-0 space-y-4 rounded-2xl border border-border/80 bg-gradient-to-b from-white to-gray-50/80 p-5 shadow-sm dark:border-dark_border dark:from-gray-900 dark:to-gray-900/50 md:sticky md:top-[var(--app-header-h,11rem)] md:max-h-[calc(100vh_-_var(--app-header-h,11rem)_-_1.5rem)] md:w-[min(100%,320px)] md:overflow-y-auto lg:w-[360px]">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Référence</p>
          <p className="mt-0.5 font-mono text-sm font-semibold text-midnight_text dark:text-white">
            {data.reference}
          </p>
        </div>
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-wider text-gray-500" htmlFor="tkt-status">
            Statut
          </label>
          <select
            id="tkt-status"
            className="mt-1.5 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-midnight_text dark:border-dark_border dark:bg-gray-800 dark:text-white"
            value={status}
            onChange={(e) => void saveStatus(e.target.value)}
          >
            <option value="pending">En attente</option>
            <option value="en_cours">En cours</option>
            <option value="resolu">Résolu</option>
            <option value="ferme">Fermé</option>
          </select>
        </div>
        <div className="h-px bg-border/80 dark:bg-gray-800" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Auteur</p>
          <p className="mt-1 font-medium text-midnight_text dark:text-white">{data.nomComplet}</p>
          <a
            href={`mailto:${encodeURIComponent(data.email)}`}
            className="mt-0.5 block text-sm text-primary hover:underline"
          >
            {data.email}
          </a>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Tél. <span className="tabular-nums">{data.telephone}</span>
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Profil : {CATEGORIE_LABEL[data.categorie] ?? data.categorie}
          </p>
        </div>
        <div className="h-px bg-border/80 dark:bg-gray-800" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Objet</p>
          <p className="mt-1.5 text-sm font-medium text-midnight_text dark:text-white">{data.objet}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">
            Message initial
          </p>
          <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border/60 bg-white/60 p-3 text-sm leading-relaxed text-midnight_text/90 dark:border-gray-800 dark:bg-gray-950/50 dark:text-gray-200">
            <p className="whitespace-pre-wrap">{data.message}</p>
          </div>
        </div>
        <p className="text-[10px] text-gray-500">
          Reçu le{" "}
          {new Date(data.createdAt ?? data.updatedAt).toLocaleString("fr-FR", {
            dateStyle: "medium",
            timeStyle: "short",
          })}{" "}
          — {STATUS_LABEL[status] ?? status}
        </p>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col space-y-4">
        <h2 className="text-sm font-semibold text-midnight_text dark:text-white">Conversation</h2>
        <div className="min-h-[280px] flex-1 overflow-y-auto rounded-2xl border border-border/80 bg-grey/20 p-4 dark:border-dark_border dark:bg-gray-900/30 md:min-h-[min(60vh,520px)] md:max-h-[calc(100vh-16rem)]">
          {data.chats.map((m) => (
            <MessageBubble key={m.id} m={m} isAgentView={true} />
          ))}
        </div>
        {err && <p className="text-sm text-red-600">{err}</p>}
        <form onSubmit={send} className="space-y-2">
          <label className="text-xs text-gray-500" htmlFor="tkt-reply">
            Votre réponse
          </label>
          <textarea
            id="tkt-reply"
            className="w-full rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-midnight_text shadow-sm dark:border-dark_border dark:bg-gray-800 dark:text-white"
            rows={4}
            placeholder="Réponse du support — visible par le demandeur"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <button
            type="submit"
            className="rounded-lg bg-gradient-to-r from-primary to-secondary px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:shadow-md"
          >
            Envoyer
          </button>
        </form>
      </div>
    </div>
  );
}
