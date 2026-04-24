"use client";
import React from "react";
import { CauseData } from "@/app/api/data";
import { useParams } from "next/navigation";
import FormPart from "@/components/Cause/CauseDetails/formPart";
import TextPart from "@/components/Cause/CauseDetails/textPart";
import Volunteer from "@/components/SharedComponent/Volunteer";
import Image from "next/image";
import Link from "next/link";
import { Icon } from "@iconify/react"

const Cause = () => {

    const { slug } = useParams();

    // Find the blog post by slug
    const item = CauseData.find((item) => item.slug === slug);
    if (!item) {
        return <div>Loading...</div>;
    }
    return (
        <>
            <section className="dark:bg-dark pt-44 py-24">
                <div className="container mx-auto lg:max-w-(--breakpoint-xl) md:max-w-(--breakpoint-md) px-4">
                    <div className="grid grid-cols-12 gap-6">
                        <div className="lg:col-span-9 col-span-12">
                            <div className=" rounded-lg overflow-hidden mb-8">
                                <Image
                                    src={item.image}
                                    alt={item.title}
                                    width={870}
                                    height={750}
                                    className="w-full h-full"
                                />
                            </div>
                            <h1 className="text-[40px] leading-tight font-semibold mb-8">
                                {item.title}
                            </h1>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="pr-4 border-r border-border dark:border-dark_border">
                                    <p className=" text-12 text-muted dark:text-white/60 mb-1">
                                        Raised
                                    </p>
                                    <h4 className="text-2xl text-midnight_text dark:text-white ">
                                        {item.raised}
                                    </h4>
                                </div>
                                <div>
                                    <p className=" text-12 text-muted dark:text-white/60 mb-1">
                                        Goal
                                    </p>
                                    <h4 className="text-2xl text-midnight_text dark:text-white ">
                                        {item.goal}
                                    </h4>
                                </div>
                            </div>
                            <div className="pb-8 mb-8 border-b border-border dark:border-dark_border">
                                <div className="w-full bg-light_grey dark:bg-midnight_text rounded-full h-4 overflow-hidden">
                                    <div className="w-60% bg-linear-to-r from-primary to-secondary relative z-1 rounded-full h-full">
                                    </div>
                                </div>
                            </div>
                            <FormPart />
                            <TextPart />
                        </div>
                        <div className="lg:col-span-3 col-span-12">
                            <h4 className="text-lg font-medium mb-6">
                                Search
                            </h4>
                            <div className="relative">
                                <input type="text" placeholder="Search ..." className="text-base px-4 py-3.5 border dark:bg-dark border-border dark:border-dark_border rounded-md w-full focus:border-primary dark:focus:border-primary focus-visible:outline-hidden" />
                                <span className="text-muted dark:text-white/60 absolute right-5 top-4">
                                    <Icon
                                        icon="tabler:search"
                                        width="25"
                                        height="25"
                                    />
                                </span>
                            </div>
                            <div className="mt-16">
                                <h4 className="text-lg font-medium mb-6">
                                    Categories
                                </h4>
                                <ul className="flex flex-col gap-4">
                                    <li>
                                        <Link href="#" className="text-base text-muted dark:text-white/60 hover:text-primary">Chlidren</Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="text-base text-muted dark:text-white/60 hover:text-primary">Development</Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="text-base text-muted dark:text-white/60 hover:text-primary">Education</Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="text-base text-muted dark:text-white/60 hover:text-primary">Environment</Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="text-base text-muted dark:text-white/60 hover:text-primary">Healthcare</Link>
                                    </li>
                                    <li>
                                        <Link href="#" className="text-base text-muted dark:text-white/60 hover:text-primary">Programs</Link>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
            <Volunteer />
        </>
    );
};

export default Cause;