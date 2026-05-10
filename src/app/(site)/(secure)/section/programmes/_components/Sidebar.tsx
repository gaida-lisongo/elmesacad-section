import Link from "next/link";
import { SectionBureauRow } from "../SectionProgrammesClient";

const SidebarProgrammes = ({
    activeSection,
    sections,
    activeId,
    setActiveId,
}: {
    activeSection: SectionBureauRow;
    sections: SectionBureauRow[];
    activeId: string;
    setActiveId: (id: string) => void;
}) => {
  return (<div className="space-y-4">
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Section active
      </h2>
      <p className="mt-2 text-sm font-medium text-midnight_text dark:text-white">
        {activeSection?.designation}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{activeSection?.cycle}</p>
      {activeSection ? (
        <Link
          href={`/sections/${encodeURIComponent(activeSection.slug)}`}
          className="mt-2 inline-block text-xs text-primary underline dark:text-primary"
        >
          Fiche section
        </Link>
      ) : null}
    </div>
    {sections.length > 1 ? (
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-md transition-shadow duration-200 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
          Autres sections
        </h2>
        <ul className="mt-2 space-y-1">
          {sections
            .filter((s) => s._id !== activeId)
            .map((s) => (
              <li key={s._id}>
                <button
                  type="button"
                  onClick={() => setActiveId(s._id)}
                  className="w-full rounded-md px-2 py-1.5 text-left text-sm text-midnight_text hover:bg-gray-50 dark:text-white dark:hover:bg-gray-800"
                >
                  {s.designation}
                </button>
              </li>
            ))}
        </ul>
      </div>
    ) : null}
  </div>);
};

export default SidebarProgrammes;