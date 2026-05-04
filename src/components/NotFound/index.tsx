"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import ClientIcon from "@/components/Common/ClientIcon";

const NotFound = () => {
  return (
    <section className="relative overflow-hidden bg-white py-20 dark:bg-darkmode lg:py-[120px]">
      <div className="container mx-auto">
        <div className="-mx-4 flex flex-wrap items-center">
          <div className="w-full px-4 md:w-5/12 lg:w-6/12">
            <div className="relative mx-auto aspect-[129/138] max-w-[400px] text-center">
              <Image
                src="/images/background/404.svg"
                alt="404 Not Found"
                width={400}
                height={400}
                className="mx-auto"
              />
              <div className="absolute -bottom-4 -right-4 h-24 w-24 rounded-2xl bg-primary/10 blur-2xl" />
              <div className="absolute -left-4 -top-4 h-32 w-32 rounded-full bg-secondary/5 blur-3xl" />
            </div>
          </div>
          <div className="w-full px-4 md:w-7/12 lg:w-6/12 xl:w-5/12">
            <div className="mt-12 md:mt-0">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                <ClientIcon icon="solar:shield-warning-bold-duotone" className="h-12 w-12" />
              </div>
              <h2 className="mb-5 text-4xl font-black leading-tight text-midnight_text dark:text-white sm:text-5xl">
                Oups ! <br />
                Page introuvable.
              </h2>
              <p className="mb-10 text-lg leading-relaxed text-slate-600 dark:text-slate-400">
                La page que vous recherchez n&apos;existe pas ou a été déplacée. 
                Ne vous inquiétez pas, vous pouvez retourner à l&apos;accueil ou accéder à votre tableau de bord.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-bold text-white transition hover:bg-darkprimary hover:shadow-lg hover:shadow-primary/20"
                >
                  <ClientIcon icon="solar:home-2-bold-duotone" className="h-5 w-5" />
                  Retour à l&apos;accueil
                </Link>
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-8 py-4 text-base font-bold text-midnight_text transition hover:bg-slate-50 dark:border-slate-800 dark:bg-gray-900 dark:text-white"
                >
                  Tableau de bord
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 -z-10 h-64 w-64 translate-x-[-20%] translate-y-[20%] rounded-full bg-primary/5 blur-3xl" />
      <div className="absolute right-0 top-0 -z-10 h-96 w-96 translate-x-[20%] translate-y-[-20%] rounded-full bg-secondary/5 blur-3xl" />
    </section>
  );
};

export default NotFound;
