"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { resolveSecureBreadcrumb } from "@/config/secureBreadcrumb";

type HeroSubProps = {
  /** Mode pages publiques (legacy) : grand titre, sans fil d’Ariane. */
  title?: string;
  /** Remplace le fil d’Ariane auto. */
  items?: { label: string; href?: string }[];
};

/**
 * Bandeau : soit un **titre** (pages site public), soit un **fil d’Ariane** (espace connecté, etc.).
 */
const HeroSub = ({ title, items: itemsOverride }: HeroSubProps) => {
  const pathname = usePathname() ?? "/";
  const segments = itemsOverride ?? (!title ? resolveSecureBreadcrumb(pathname) : null);

  if (title) {
    return (
      <section className="mt-20 bg-[url('/images/background/herosub-banner.png')] bg-cover bg-no-repeat py-40 sm:mt-44 sm:pt-32 lg:mt-40 lg:pt-40">
        <div className="container mx-auto max-w-(--breakpoint-xl) px-4">
          <h2 className="text-4xl font-medium text-white md:text-6xl" data-aos="fade-right">
            {title}
          </h2>
        </div>
      </section>
    );
  }

  if (!segments || segments.length === 0) {
    return null;
  }

  return (
    <section className="bg-[url('/images/background/herosub-banner.png')] bg-cover bg-no-repeat pb-12 pt-28 sm:mt-44 sm:pt-32 md:pb-16 lg:mt-40 lg:pb-20 lg:pt-36">
      <div className="container mx-auto max-w-(--breakpoint-xl) px-4">
        <nav aria-label="Fil d’Ariane" className="text-sm text-white/90">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li className="flex items-center gap-2">
              <Link href="/" className="font-medium text-white transition hover:text-white">
                Accueil
              </Link>
            </li>
            {segments.map((seg, i) => (
              <li key={`${seg.label}-${i}`} className="flex items-center gap-2">
                <span className="text-white/50" aria-hidden>
                  /
                </span>
                {seg.href && i < segments.length - 1 ? (
                  <Link href={seg.href} className="font-medium text-white transition hover:underline">
                    {seg.label}
                  </Link>
                ) : (
                  <span
                    className={
                      i === segments.length - 1
                        ? "font-semibold text-white"
                        : "font-medium text-white/90"
                    }
                  >
                    {seg.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </section>
  );
};

export default HeroSub;
