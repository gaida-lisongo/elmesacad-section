'use client';

import { useMemo, useState } from "react";

type CsvImportProps = {
  templateHeaders: string[];
  onPersist: (rawText: string, onProgress?: (progress: number) => void) => Promise<void> | void;
};

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

const separators = [",", ";", "|", "\t"];

const detectSeparator = (line: string): string => {
  const ranked = separators
    .map((separator) => ({
      separator,
      count: line.split(separator).length,
    }))
    .sort((a, b) => b.count - a.count);

  return ranked[0]?.separator ?? ",";
};

const parseCsv = (content: string, separator: string): ParsedCsv => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(separator).map((item) => item.trim());
  const rows = lines
    .slice(1)
    .map((line) => line.split(separator).map((cell) => cell.trim()))
    .filter((row) => row.some((cell) => cell.length > 0));

  return { headers, rows };
};

export default function CsvImport({ templateHeaders, onPersist }: CsvImportProps) {
  const [sourceName, setSourceName] = useState("");
  const [rawContent, setRawContent] = useState("");
  const [separator, setSeparator] = useState(",");
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedHeaders, setSelectedHeaders] = useState<string[]>([]);
  const [isPersisting, setIsPersisting] = useState(false);
  const [progress, setProgress] = useState(0);

  const parsed = useMemo(() => parseCsv(rawContent, separator), [rawContent, separator]);

  const rowsByHeader = useMemo(() => {
    if (parsed.headers.length === 0) {
      return [];
    }

    return parsed.rows.map((row) => {
      const mapped: Record<string, string> = {};
      parsed.headers.forEach((header, index) => {
        mapped[header] = row[index] ?? "";
      });
      return mapped;
    });
  }, [parsed.headers, parsed.rows]);

  const filteredRows = useMemo(() => {
    if (selectedHeaders.length === 0) {
      return rowsByHeader;
    }

    return rowsByHeader.map((row) => {
      const filtered: Record<string, string> = {};
      selectedHeaders.forEach((header) => {
        filtered[header] = row[header] ?? "";
      });
      return filtered;
    });
  }, [rowsByHeader, selectedHeaders]);

  const visibleHeaders = useMemo(
    () => (selectedHeaders.length > 0 ? selectedHeaders : parsed.headers),
    [selectedHeaders, parsed.headers]
  );

  const handleFileLoad = async (file: File) => {
    const content = await file.text();
    const firstLine = content.split(/\r?\n/).find((line) => line.trim().length > 0) ?? "";
    const detectedSeparator = detectSeparator(firstLine);
    const parsedWithDetected = parseCsv(content, detectedSeparator);

    setSourceName(file.name);
    setRawContent(content);
    setSeparator(detectedSeparator);
    setSelectedHeaders(parsedWithDetected.headers);
    setCurrentStep(1);
    setProgress(0);
  };

  const persistPayload = async () => {
    if (filteredRows.length === 0) {
      return;
    }

    setIsPersisting(true);
    setCurrentStep(3);
    setProgress(0);

    try {
      const headers = selectedHeaders.length > 0 ? selectedHeaders : parsed.headers;
      const lines = filteredRows.map((row) =>
        headers.map((header) => row[header] ?? "").join(",")
      );
      const rawText = lines.join("\n");

      await onPersist(rawText, (value) => setProgress(value));
      setProgress(100);
    } finally {
      setIsPersisting(false);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-700">
      <h4 className="text-sm font-semibold text-midnight_text dark:text-white">Import CSV</h4>

      <div className="mt-3 space-y-2 text-xs">
        <p className={currentStep === 1 ? "font-semibold text-primary" : "text-gray-500"}>
          Etape 1: Chargement de la source
        </p>
        <p className={currentStep === 2 ? "font-semibold text-primary" : "text-gray-500"}>
          Etape 2: Chargement des donnees en memoire
        </p>
        <p className={currentStep === 3 ? "font-semibold text-primary" : "text-gray-500"}>
          Etape 3: Persistance
        </p>
      </div>

      <div className="mt-4 rounded-md border border-dashed border-gray-300 p-3 dark:border-gray-700">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleFileLoad(file);
          }}
          className="text-sm"
        />
        {sourceName && <p className="mt-2 text-xs text-gray-500">Fichier: {sourceName}</p>}

        {parsed.headers.length > 0 && (
          <div className="mt-3">
            <label className="text-xs text-gray-500">Separateur detecte</label>
            <select
              value={separator}
              onChange={(event) => setSeparator(event.target.value)}
              className="mt-1 block rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              <option value=",">Virgule (,)</option>
              <option value=";">Point-virgule (;)</option>
              <option value="|">Pipe (|)</option>
              <option value="\t">Tabulation</option>
            </select>

            <div className="mt-3">
              <p className="text-xs text-gray-500">Entetes detectees</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {parsed.headers.map((header) => {
                  const selected = selectedHeaders.includes(header);
                  return (
                    <button
                      key={header}
                      type="button"
                      onClick={() =>
                        setSelectedHeaders((prev) =>
                          prev.includes(header)
                            ? prev.filter((item) => item !== header)
                            : [...prev, header]
                        )
                      }
                      className={`rounded-full px-2 py-1 text-xs ${
                        selected
                          ? "bg-primary text-white"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      }`}
                    >
                      {header}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="mt-3 rounded-md border border-primary px-3 py-1 text-xs font-semibold text-primary"
            >
              Valider les entetes
            </button>
          </div>
        )}
      </div>

      {currentStep >= 2 && filteredRows.length > 0 && (
        <div className="mt-4 rounded-md border border-gray-200 p-3 dark:border-gray-700">
          <p className="text-xs text-gray-500">Lignes chargees: {filteredRows.length}</p>
          <p className="text-xs text-gray-500">Colonnes retenues: {visibleHeaders.join(", ")}</p>

          <div className="mt-3 overflow-x-auto rounded-md border border-gray-200 dark:border-gray-700">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  {visibleHeaders.map((header) => (
                    <th
                      key={header}
                      className="border-b border-gray-200 px-3 py-2 font-semibold uppercase tracking-wide text-gray-600 dark:border-gray-700 dark:text-gray-300"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredRows.slice(0, 8).map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className="border-b border-gray-100 odd:bg-white even:bg-gray-50 dark:border-gray-800 dark:odd:bg-gray-900 dark:even:bg-gray-900/60"
                  >
                    {visibleHeaders.map((header) => (
                      <td key={`${rowIndex}-${header}`} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                        {row[header] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 text-[11px] text-gray-500">
            Apercu limite a 8 lignes pour validation avant persistance.
          </div>
        </div>
      )}

      {currentStep >= 2 && (
        <div className="mt-4">
          <button
            type="button"
            onClick={persistPayload}
            disabled={isPersisting || filteredRows.length === 0}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Enregistrer
          </button>

          {currentStep === 3 && (
            <div className="mt-3">
              <div className="h-2 w-full rounded bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-2 rounded bg-primary transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">{progress}%</p>
            </div>
          )}
        </div>
      )}

      {templateHeaders.length > 0 && (
        <p className="mt-3 text-[11px] text-gray-500">
          Modele attendu: {templateHeaders.join(", ")}
        </p>
      )}
    </div>
  );
}
