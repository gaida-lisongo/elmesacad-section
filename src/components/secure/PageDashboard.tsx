type MetricCard = {
  label: string;
  value: string | number;
  trend?: string;
};

type WhiteListItem = {
  label: string;
  value: string;
};

type TableRow = {
  id: string;
  columns: string[];
};

type PageDashboardProps = {
  title: string;
  metrics: MetricCard[];
  chartTitle: string;
  chartPlaceholder?: string;
  whiteList: WhiteListItem[];
  tableHeaders: string[];
  tableRows: TableRow[];
};

export default function PageDashboard({
  title,
  metrics,
  chartTitle,
  chartPlaceholder = "Zone chart (3/5)",
  whiteList,
  tableHeaders,
  tableRows,
}: PageDashboardProps) {
  return (
    <section className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-midnight_text dark:text-white">{title}</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {metrics.slice(0, 3).map((metric) => (
          <article
            key={metric.label}
            className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
          >
            <p className="text-xs uppercase text-gray-500">{metric.label}</p>
            <p className="mt-2 text-2xl font-bold text-midnight_text dark:text-white">{metric.value}</p>
            {metric.trend && <p className="mt-1 text-xs text-emerald-600">{metric.trend}</p>}
          </article>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-3">
          <h2 className="text-sm font-semibold text-midnight_text dark:text-white">{chartTitle}</h2>
          <div className="mt-3 flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700">
            {chartPlaceholder}
          </div>
        </article>

        <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:col-span-2">
          <h2 className="text-sm font-semibold text-midnight_text dark:text-white">WhiteList</h2>
          <ul className="mt-3 space-y-2">
            {whiteList.map((item) => (
              <li key={item.label} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                <span className="text-gray-600 dark:text-gray-300">{item.label}</span>
                <span className="font-semibold text-midnight_text dark:text-white">{item.value}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h2 className="mb-3 text-sm font-semibold text-midnight_text dark:text-white">TableList</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {tableHeaders.map((header) => (
                  <th key={header} className="px-3 py-2 text-xs uppercase tracking-wide text-gray-500">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-100 dark:border-gray-800">
                  {row.columns.map((col, idx) => (
                    <td key={`${row.id}-${idx}`} className="px-3 py-2 text-gray-700 dark:text-gray-200">
                      {col}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>
    </section>
  );
}

export type { MetricCard, WhiteListItem, TableRow };
