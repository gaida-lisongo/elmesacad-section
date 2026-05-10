import { ProgrammeRow, SectionBureauRow } from "../SectionProgrammesClient";

const ProgrammeItem = ({
    activeSection,
    p,
    openEditModal,
    deleteProgramme,
}: {
    activeSection: SectionBureauRow;
    p: ProgrammeRow;
    openEditModal: (p: ProgrammeRow) => void;
    deleteProgramme: (p: string) => void;
}) => {
  return (<>
  <div className="rounded-xl border border-gray-200/80 bg-gradient-to-br from-white to-gray-50 p-3 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:from-gray-900 dark:to-gray-900/60">
    <p className="text-sm text-gray-600 dark:text-gray-400">
      Programme rattaché à <strong>{activeSection?.designation}</strong>.
    </p>
    <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {p.credits} crédits
      </span>
      <span className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">
        {p.semestres?.length ?? 0} semestre(s)
      </span>
    </div>
  </div>
  <div className="mt-3 flex flex-wrap gap-2">
    <button
      type="button"
      onClick={() => openEditModal(p)}
      className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-gray-600"
    >
      Modifier
    </button>
    <button
      type="button"
      onClick={() => void deleteProgramme(p._id)}
      className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-red-800 dark:text-red-300"
    >
      Supprimer
    </button>
  </div></>);
};

export default ProgrammeItem;