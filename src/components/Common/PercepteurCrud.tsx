'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';
import Image from 'next/image';
import type { SessionResourceRow } from "@/actions/gestionnaireSessionResources";
import type { AgentListItem } from "@/lib/services/UserManager";
import {
  createPercepteur,
  deletePercepteur,
  findPercepteurs,
  updatePercepteur,
} from '@/actions/percepteurActions';
import { UserDatabaseSearch } from '../secure/UserDatabaseSearch';

const defaultPhoto = '/images/user.jpg';

/* ─── Types ─────────────────────────────────────────── */
type CommandeStats = {
  totalCommandes: number;
  totalAmount: number;
  pendingCount: number;
  paidCount: number;
  failedCount: number;
  paidAmount: number;
};

type PercepteurWithAgent = {
  _id: string;
  agent: {
    _id: string;
    name: string;
    email: string;
    matricule: string;
    photo?: string;
    role?: string;
    telephone?: string;
    status?: string;
  };
  ressources: {
    categorie: string;
    reference: string;
    produit: string;
  }[];
  commandes: any[];
  stats: CommandeStats;
  createdAt: string;
};

/* ─── Mini carte de stat ──────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color: 'primary' | 'emerald' | 'amber' | 'rose' | 'blue';
}) {
  const colorClasses: Record<string, string> = {
    primary: 'bg-primary/5 text-primary',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300',
    blue: 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300',
  };

  return (
    <div className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 ${colorClasses[color] || colorClasses.primary}`}>
      <Icon icon={icon} className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[11px] font-semibold whitespace-nowrap">{value}</span>
      <span className="text-[10px] opacity-75 hidden sm:inline">{label}</span>
    </div>
  );
}

/* ─── Modale d'édition ──────────────────────────────── */
function EditModal({
  percepteur,
  onClose,
  onSaved,
}: {
  percepteur: PercepteurWithAgent;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ressources, setRessources] = useState(percepteur.ressources);

  const handleSave = async () => {
    await updatePercepteur(percepteur._id, { ressources } as any);
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold">Modifier le percepteur</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full dark:hover:bg-gray-800">
            <Icon icon="solar:close-circle-linear" className="h-6 w-6" />
          </button>
        </div>

        {/* Infos agent (lecture seule) */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-gray-50 rounded-2xl dark:bg-gray-800/50">
          <Image
            src={percepteur.agent.photo || defaultPhoto}
            alt={percepteur.agent.name}
            width={48}
            height={48}
            className="h-12 w-12 rounded-xl object-cover ring-2 ring-white"
          />
          <div>
            <p className="font-semibold">{percepteur.agent.name}</p>
            <p className="text-xs text-gray-500">{percepteur.agent.email} — {percepteur.agent.matricule}</p>
          </div>
        </div>

        {/* Ressources */}
        <label className="block text-sm font-medium mb-2">Ressources associées</label>
        {ressources.map((res, idx) => (
          <div key={idx} className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              value={res.categorie}
              onChange={(e) => {
                const copy = [...ressources];
                copy[idx] = { ...copy[idx], categorie: e.target.value };
                setRessources(copy);
              }}
              placeholder="Catégorie"
            />
            <input
              className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-700"
              value={res.reference}
              onChange={(e) => {
                const copy = [...ressources];
                copy[idx] = { ...copy[idx], reference: e.target.value };
                setRessources(copy);
              }}
              placeholder="Référence"
            />
          </div>
        ))}

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold dark:border-gray-700">
            Annuler
          </button>
          <button onClick={handleSave} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-md">
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Composant principal ───────────────────────────── */
export default function PercepteurCrud({
  r,
  onBack,
}: {
  r: SessionResourceRow;
  onBack: () => void;
}) {
  const [percepteurs, setPercepteurs] = useState<PercepteurWithAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<PercepteurWithAgent | null>(null);

  const loadPercepteurs = useCallback(async () => {
    setLoading(true);
    const res = await findPercepteurs({ 'ressources.reference': r.id });
    if (res.success) setPercepteurs(res.data);
    setLoading(false);
  }, [r.id]);

  useEffect(() => { loadPercepteurs(); }, [loadPercepteurs]);

  const handleAddAgent = async (agent: AgentListItem) => {
    await createPercepteur({
      agent: agent.id,
      ressources: [{
        categorie: 'session',
        reference: r.id,
        produit: 'session',
      }],
      commandes: [],
    });
    loadPercepteurs();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Supprimer le percepteur « ${name} » ?`)) return;
    await deletePercepteur(id);
    loadPercepteurs();
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'USD' }).format(amount);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700"
          >
            <Icon icon="solar:arrow-left-linear" className="h-5 w-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold tracking-tight">Percepteurs</h2>
            <p className="text-sm text-gray-500">{r.designation}</p>
          </div>
        </div>

        {/* Métriques globales */}
        <div className="flex flex-wrap gap-2 text-sm">
          <span className="flex items-center gap-1.5 rounded-xl bg-primary/5 px-3 py-1.5 font-semibold text-primary">
            <Icon icon="solar:users-group-rounded-bold-duotone" className="h-4 w-4" />
            {percepteurs.length} percepteur{percepteurs.length > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">
            <Icon icon="solar:check-circle-bold-duotone" className="h-4 w-4" />
            {percepteurs.filter((p) => p.agent.status !== 'inactive').length} actif
          </span>
        </div>
      </div>

      {/* ── Zone d'ajout ────────────────────────── */}
      <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/60 p-5 dark:border-gray-700 dark:bg-gray-800/30">
        <label className="mb-2 flex items-center gap-2 text-sm font-medium">
          <Icon icon="solar:user-plus-rounded-bold-duotone" className="h-4 w-4 text-primary" />
          Ajouter un agent percepteur
        </label>
        <UserDatabaseSearch
          kind="agent"
          onSelect={handleAddAgent}
          placeholder="Rechercher un agent par nom, email ou matricule…"
          clearOnSelect
        />
      </div>

      {/* ── Grille de cartes ────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 animate-pulse rounded-2xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : percepteurs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50/50 px-8 py-16 text-center dark:border-gray-600 dark:bg-gray-900/40">
          <Icon icon="solar:users-group-rounded-bold-duotone" className="mb-3 h-14 w-14 text-gray-300 dark:text-gray-600" />
          <p className="font-semibold text-gray-700 dark:text-gray-300">Aucun percepteur</p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Ajoutez un agent percepteur pour cette session.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {percepteurs.map((p) => (
            <div
              key={p._id}
              className="group relative flex flex-col rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800/60"
            >
              {/* Photo + infos principales */}
              <div className="flex items-center gap-3 mb-3">
                <Image
                  src={p.agent.photo || defaultPhoto}
                  alt={p.agent.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 rounded-xl object-cover ring-2 ring-white shadow-sm"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sm">{p.agent.name}</p>
                  <p className="truncate text-xs text-gray-400">{p.agent.email}</p>
                </div>
                <span
                  className={`shrink-0 h-2.5 w-2.5 rounded-full ${
                    p.agent.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'
                  }`}
                  title={p.agent.status === 'active' ? 'Actif' : 'Inactif'}
                />
              </div>

              {/* Stats commandes sur la carte */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                <StatCard
                  icon="solar:cart-large-minimalistic-bold-duotone"
                  label="commandes"
                  value={p.stats.totalCommandes}
                  color="primary"
                />
                <StatCard
                  icon="solar:check-circle-bold-duotone"
                  label="payées"
                  value={p.stats.paidCount}
                  color="emerald"
                />
                <StatCard
                  icon="solar:clock-circle-bold-duotone"
                  label="en attente"
                  value={p.stats.pendingCount}
                  color="amber"
                />
                {p.stats.failedCount > 0 && (
                  <StatCard
                    icon="solar:close-circle-bold-duotone"
                    label="échouées"
                    value={p.stats.failedCount}
                    color="rose"
                  />
                )}
              </div>

              {/* Montants */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-3">
                <span className="font-semibold text-gray-700 dark:text-gray-200">
                  Total : {formatCurrency(p.stats.totalAmount)}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                  Collecté : {formatCurrency(p.stats.paidAmount)}
                </span>
              </div>

              {/* Ressources */}
              {p.ressources?.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {p.ressources.map((res, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      <Icon icon="solar:folder-bold-duotone" className="h-3 w-3" />
                      {res.categorie}/{res.reference}
                    </span>
                  ))}
                </div>
              )}

              {/* Date */}
              <p className="mt-auto text-[10px] text-gray-400">
                Créé le {new Date(p.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>

              {/* Actions hover */}
              <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  onClick={() => setEditing(p)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-gray-500 shadow-sm backdrop-blur hover:bg-primary/10 hover:text-primary dark:bg-gray-800/80 dark:hover:bg-primary/20"
                  title="Modifier"
                >
                  <Icon icon="solar:pen-bold-duotone" className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(p._id, p.agent.name)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/80 text-gray-500 shadow-sm backdrop-blur hover:bg-rose-50 hover:text-rose-600 dark:bg-gray-800/80 dark:hover:bg-rose-950/30"
                  title="Supprimer"
                >
                  <Icon icon="solar:trash-bin-trash-bold-duotone" className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modale d'édition ────────────────────── */}
      {editing && (
        <EditModal
          percepteur={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            loadPercepteurs();
          }}
        />
      )}
    </div>
  );
}