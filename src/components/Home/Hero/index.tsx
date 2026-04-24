"use client"

import { getPathFunc } from "@/utils/testing";
import Link from "next/link";
import { useContext, useEffect, useState } from "react";
import { Test } from "./Test";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Donation } from "./Donation";
import DonationFormContext from "@/app/context/donationContext";

const Hero = () => {
  const donationInfo = useContext(DonationFormContext);
  return (
    <>
    <section className="relative bg-cover text-white md:pt-40 md:pb-28 py-20 bg-no-repeat bg-[url('/images/hero/banner-bg.jpg')] lg:mt-40 sm:mt-44 mt-20" >
      <div className="container mx-auto lg:max-w-(--breakpoint-xl) px-4 grid grid-cols-12">
        <div className="bg-white rounded-md p-10 lg:col-span-5 md:col-span-7 sm:col-span-10 col-span-12 dark:bg-dark" data-aos="fade-right">
          <div className="flex justify-between mb-6">
            <div className="px-4 py-2 bg-midnight_text rounded-sm">
              <p className=" text-white text-sm font-semibold">
                Featured
              </p>
            </div>
            <p className="text-muted dark:text-white/60 text-xs font-medium">193 days left</p>
          </div>
          <h3 className="text-midnight_text dark:text-white text-lg font-bold mb-6">
            Give small help to african moms who struggle
          </h3>
          <p className="text-muted dark:text-white/60 text-base mb-5">
          Help provide African mothers with food, healthcare, and skills to build better lives for their families.
          </p>
          <div className="grid grid-cols-2 border-t border-border dark:border-dark_border mb-5">
            <div className="col-span-1 border-r border-border dark:border-dark_border px-5 py-4">
              <p className="text-xs text-muted dark:text-white/60 mb-1 ">Raised</p>
              <h4 className="text-2xl text-secondary">$65,360</h4>
            </div>
            <div className="col-span-1 px-5 py-4">
              <p className="text-xs text-muted dark:text-white/60 mb-1">Goal</p>
              <h4 className="text-2xl text-midnight_text dark:text-white">$124,500</h4>
            </div>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => donationInfo?.setIsDonationOpen(true)}
              className="text-white bg-linear-to-r text-sm from-error to-warning px-7 py-4 hover:from-white hover:to-white dark:hover:from-dark dark:hover:to-dark border font-semibold border-transparent hover:border-error hover:text-error rounded-md"
            >
              Donate now
            </button>
            <Test/>
          </div>
        </div>
      </div>
    </section>

    </>
    
  );
};

export default Hero;
