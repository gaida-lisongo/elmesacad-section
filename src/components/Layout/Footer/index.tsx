import React from "react";
import Link from "next/link";
import Image from "next/image";
import Logo from "../Header/Logo";
import { Icon } from "@iconify/react/dist/iconify.js";
import { loadPublicFooterLinks } from "@/actions/publicFooterLinks";

const Footer = async () => {
  const { filieres, sections } = await loadPublicFooterLinks();

  return (
    <footer className="pt-16 dark:bg-dark">
      <div className="container mx-auto lg:max-w-(--breakpoint-xl) md:max-w-(--breakpoint-md) px-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-8 pb-10 ">
          <div className="lg:col-span-3 md:col-span-4 col-span-6">
            <Logo />
            <div className="mt-6">
              <p className="text-sm font-light text-muted dark:text-white/60 mb-6">
                L&apos;INBTP forme des ingenieurs et techniciens capables de concevoir, construire et innover pour le
                developpement durable des infrastructures en RDC et en Afrique.
              </p>
            </div>
          </div>
          <div className="lg:col-span-3 md:col-span-4 col-span-6">
            <div className="lg:pl-10">
              <div className="flex items-start mb-8 gap-4">
                <Image
                  src="/images/icons/icon-pin.svg"
                  alt="icon"
                  width={24}
                  height={24}
                />
                <div className="">
                  <h5 className="text-sm text-midnight_text dark:text-white mb-4">
                    Adresse INBTP
                  </h5>
                  <p className="text-sm text-muted dark:text-white/60">
                    21 Avenue de la Montagne, Jolie Parc/Ngaliema, Kinshasa, RDC
                  </p>
                </div>
              </div>
              <div className="flex items-center mb-8 gap-4">
                <Image
                  src="/images/icons/icon-phone.svg"
                  alt="icon"
                  width={24}
                  height={24}
                />
                <div className="">
                  <Link
                    href="tel:+243812345678"
                    className="text-sm text-midnight_text dark:text-white mb-0 hover:text-primary!"
                  >
                    +243 81 234 5678
                  </Link>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Image
                  src="/images/icons/icon-mail.svg"
                  alt="icon"
                  width={24}
                  height={24}
                />
                <div className="">
                  <Link
                    href="mailto:contact@inbtp.ac.cd"
                    className="text-sm text-midnight_text dark:text-white mb-0 hover:text-primary!"
                  >
                    contact@inbtp.ac.cd
                  </Link>
                </div>
              </div>
            </div>
          </div>
          <div className="lg:col-span-3 md:col-span-4 col-span-6">
            <h4 className="text-base text-midnight_text dark:text-white mb-4">
              Filieres
            </h4>
            <ul className="pl-5 max-h-64 overflow-y-auto pr-2">
              {filieres.map((item) => (
                <li key={item.slug} className="mb-4">
                  <Link
                    href={`/filieres/${item.slug}`}
                    className="text-sm relative text-muted dark:text-white/60 hover:text-primary dark:hover:text-primary hover:before:border-primary before:content-[''] before:absolute before:w-2 before:h-2 before:border-t-2 before:border-r-2 before:top-1 before:-left-5 before:rotate-45"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              {filieres.length === 0 ? (
                <li className="text-sm text-muted dark:text-white/60">Aucune filiere disponible.</li>
              ) : null}
            </ul>
          </div>
          <div className="lg:col-span-3 md:col-span-4 col-span-6">
            <h4 className="text-base text-midnight_text dark:text-white mb-4">
              Sections
            </h4>
            <ul className="pl-5 max-h-64 overflow-y-auto pr-2">
              {sections.map((item) => (
                <li key={item.slug} className="mb-4">
                  <Link
                    href={`/sections/${item.slug}`}
                    className="text-sm relative text-muted dark:text-white/60 hover:text-primary dark:hover:text-primary hover:before:border-primary before:content-[''] before:absolute before:w-2 before:h-2 before:border-t-2 before:border-r-2 before:top-1 before:-left-5 before:rotate-45"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
              {sections.length === 0 ? (
                <li className="text-sm text-muted dark:text-white/60">Aucune section disponible.</li>
              ) : null}
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-border dark:border-dark_border">
        <div className="container mx-auto lg:max-w-(--breakpoint-xl) md:max-w-(--breakpoint-md) px-4 flex items-center justify-between py-6 lg:flex-nowrap flex-wrap lg:gap-0 gap-4">
          <p className="text-sm text-midnight_text dark:text-white">
            © Tous droits reserves -{" "}
            <Link
              href="https://www.inbtp.ac.cd/"
              className="hover:text-primary!"
            >
              INBTP
            </Link>
            .
          </p>
          <div className="flex items-center gap-6">
            <Link href="#">
              <Icon
                icon="ri:facebook-fill"
                className="text-xl text-midnight_text dark:text-white hover:text-primary! cursor-pointer"
              />
            </Link>
            <Link href="#">
              <Icon
                icon="mdi:instagram"
                className="text-xl text-midnight_text dark:text-white hover:text-primary! cursor-pointer"
              />
            </Link>
            <Link href="#">
              <Icon
                icon="ri:linkedin-fill"
                className="text-xl text-midnight_text dark:text-white hover:text-primary! cursor-pointer"
              />
            </Link>
            <Link href="#">
              <Icon
                icon="line-md:twitter-x-alt"
                className="text-base text-midnight_text dark:text-white hover:text-primary! cursor-pointer"
              />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
