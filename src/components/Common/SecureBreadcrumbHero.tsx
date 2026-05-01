"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { resolveSecureBreadcrumb } from "@/config/secureBreadcrumb";

const securePageDescriptions: Record<string, string> = {
  "Tableau de bord": "Pilotez vos activites et vos indicateurs en un seul espace.",
  Profil: "Consultez et mettez a jour vos informations personnelles.",
  Agents: "Gerez les comptes agents et leurs habilitations.",
  "Étudiants": "Recherchez et suivez les informations des etudiants.",
  Sections: "Administrez les sections et leurs configurations.",
  "Autorisations de section": "Configurez les droits et acces des membres de section.",
  "Archivage des notes": "Archivez et consultez les donnees de notes.",
  "Fiche de cotation": "Renseignez et suivez les fiches de cotation.",
  "Descripteurs de cours": "Mettez a jour les descripteurs pedagogiques.",
  Tickets: "Suivez et traitez les tickets de support.",
  "Espace connecté": "Accedez aux outils internes de gestion.",
};

export default function SecureBreadcrumbHero() {
  const pathname = usePathname() ?? "/";
  const segments = resolveSecureBreadcrumb(pathname);
  const pageName = segments[segments.length - 1]?.label || "Espace connecté";
  const pageDescription =
    securePageDescriptions[pageName] ?? "Accedez aux modules et ressources de votre espace securise.";

  return (
    <section className="relative z-10 min-h-[420px] overflow-hidden pb-12 pt-32 md:min-h-[460px] md:pt-28 lg:min-h-[500px] lg:pt-32">
      <Image
        src="/images/inbtp/jpg/img-19.jpg"
        alt="INBTP"
        fill
        priority
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-900/75 to-slate-900/55" />

      <div className="relative container mx-auto mt-14 px-4 md:mt-16 md:px-6 lg:mt-24">
        <div className="grid gap-6 rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-sm md:p-8 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="min-w-0 text-center lg:text-left">
            <h1 className="text-3xl font-extrabold leading-tight text-white sm:text-4xl md:text-5xl">
              {pageName}
            </h1>
            <p className="mx-auto mt-3 max-w-3xl text-sm text-white/85 md:text-base lg:mx-0">{pageDescription}</p>

            <ul className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm font-medium text-white/85 lg:justify-start">
              <li>
                <Link href="/" className="transition hover:text-white">
                  Accueil
                </Link>
              </li>
              {segments.map((seg, index) => (
                <li key={`${seg.label}-${index}`} className="flex items-center gap-2">
                  <span className="text-white/70">/</span>
                  {seg.href && index < segments.length - 1 ? (
                    <Link href={seg.href} className="transition hover:underline">
                      {seg.label}
                    </Link>
                  ) : (
                    <span className="font-semibold text-white">{seg.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="justify-self-center lg:justify-self-end">
            <div className="rounded-2xl border border-white/25 bg-white/15 p-3 backdrop-blur-sm">
              <Image
                src="/images/inbtp/png/img-2.png"
                alt="Logo INBTP"
                width={72}
                height={72}
                className="h-16 w-16 object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
