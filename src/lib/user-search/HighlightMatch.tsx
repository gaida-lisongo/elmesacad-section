"use client";

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type HighlightMatchProps = {
  text: string;
  query: string;
  className?: string;
};

/**
 * Surligne des occurrences d’une sous-chaîne (recherche insensible à la casse).
 */
export function HighlightMatch({ text, query, className = "" }: HighlightMatchProps) {
  const q = query.trim();
  if (!q) {
    return <>{text}</>;
  }
  const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) => {
        if (i % 2 === 1) {
          return (
            <mark
              key={`m-${i}-${part}`}
              className={`rounded-sm bg-[#082b1c]/15 px-0.5 font-semibold text-inherit dark:bg-[#082b1c]/35 ${className}`.trim()}
            >
              {part}
            </mark>
          );
        }
        return <span key={`s-${i}`}>{part}</span>;
      })}
    </>
  );
}
