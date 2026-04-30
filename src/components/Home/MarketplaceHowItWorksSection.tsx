"use client";

import type { HowItWorks } from "@/components/Home/marketplaceHome.data";

export default function MarketplaceHowItWorksSection({ howItWorks }: { howItWorks: HowItWorks[] }) {
  return (
    <section className="mt-7 rounded-none border-y border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-darklight md:p-8">
      <h3 className="mb-6 text-center text-2xl font-bold text-midnight_text dark:text-white">How Tutoring Works</h3>
      <div className="grid gap-4 md:grid-cols-3">
        {howItWorks.map((item) => (
          <article key={item.id} className="rounded-2xl border border-slate-200 p-5 text-center dark:border-slate-700">
            <p className="text-2xl">{item.icon}</p>
            <h4 className="mt-2 text-lg font-semibold text-midnight_text dark:text-white">{item.title}</h4>
            <p className="mt-1 text-sm text-muted">{item.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
