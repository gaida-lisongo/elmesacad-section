"use client";

export type DescriptionBloc = { title: string; contenu: string };

export function cloneDescription(src?: DescriptionBloc[] | null): DescriptionBloc[] {
  if (!src?.length) return [];
  return src.map((b) => ({ title: b.title ?? "", contenu: b.contenu ?? "" }));
}

/** Garde uniquement les blocs avec titre et contenu non vides ; signale les blocs incomplets. */
export function parseDescriptionForSave(
  items: DescriptionBloc[]
): { ok: true; value: DescriptionBloc[] } | { ok: false; message: string } {
  const value: DescriptionBloc[] = [];
  for (const b of items) {
    const t = b.title.trim();
    const c = b.contenu.trim();
    if (!t && !c) continue;
    if (!t || !c) {
      return {
        ok: false,
        message: "Chaque bloc de description doit avoir un titre et un texte, ou supprimez le bloc incomplet.",
      };
    }
    value.push({ title: t, contenu: c });
  }
  return { ok: true, value };
}

export function DescriptionBlocsEditor({
  label,
  hint,
  items,
  onChange,
}: {
  label: string;
  hint?: string;
  items: DescriptionBloc[];
  onChange: (next: DescriptionBloc[]) => void;
}) {
  const add = () => onChange([...items, { title: "", contenu: "" }]);
  const remove = (i: number) => onChange(items.filter((_, j) => j !== i));
  const patch = (i: number, field: keyof DescriptionBloc, value: string) => {
    onChange(items.map((b, j) => (j === i ? { ...b, [field]: value } : b)));
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-gray-600 dark:text-gray-300">{label}</span>
          {hint ? <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{hint}</p> : null}
        </div>
        <button
          type="button"
          onClick={add}
          className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium dark:border-gray-600"
        >
          + Bloc
        </button>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500 dark:text-gray-400">Aucun bloc — ajoutez des paragraphes (titre + texte).</p>
      ) : (
        <ul className="space-y-3">
          {items.map((b, i) => (
            <li key={i} className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-900/50">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="text-[11px] text-red-600 hover:underline dark:text-red-400"
                >
                  Retirer ce bloc
                </button>
              </div>
              <label className="mt-1 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                Titre du bloc
                <input
                  className="mt-0.5 w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={b.title}
                  onChange={(e) => patch(i, "title", e.target.value)}
                  placeholder="ex. Objectifs"
                />
              </label>
              <label className="mt-2 block text-[11px] font-medium text-gray-600 dark:text-gray-400">
                Contenu
                <textarea
                  className="mt-0.5 min-h-[72px] w-full resize-y rounded-md border border-gray-300 px-2 py-1.5 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  value={b.contenu}
                  onChange={(e) => patch(i, "contenu", e.target.value)}
                  placeholder="Texte…"
                  rows={3}
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
