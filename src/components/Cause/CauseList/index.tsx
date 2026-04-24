import Link from "next/link";
import { CauseData } from "@/app/api/data";
import Image from "next/image";

const CauseList = () => {
    return (
        <section className="lg:py-28 py-16 dark:bg-dark">
            <div className="container mx-auto lg:max-w-(--breakpoint-xl) px-4">
                <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-8">
                    {CauseData.map((item, index) => (
                        <Link href={`/cause/${item.slug}`} key={index} data-aos="fade-up" data-aos-delay={`${index * 100}`}>
                            <div className="bg-white dark:bg-darkmode group h-full flex flex-col rounded-md">
                                <div className="overflow-hidden flex-1">
                                    <Image
                                        src={item.image}
                                        alt="image"
                                        width={350}
                                        height={250}
                                        className="w-full h-auto group-hover:scale-110 duration-300"
                                    />
                                </div>
                                <div className="px-8 pt-8 pb-6 shadow-cause-shadow flex-1 flex flex-col justify-between">
                                    <h4 className="text-lg font-bold group-hover:text-primary mb-4">
                                        {item.title}
                                    </h4>
                                    <p className="text-muted dark:text-white/60 text-base pb-8 border-b-2 border-border relative after:content-[''] after:absolute after:w-70% after:h-0.5 after:-bottom-0.5 after:left-0 after:bg-linear-to-r after:from-primary after:to-secondary">
                                        {item.text}
                                    </p>
                                    <div className="flex gap-4 mt-4">
                                        <div className="pr-4 border-r-2 dark:border-dark_border">
                                            <h4 className=" text-muted dark:text-white/60 text-sm mb-1">
                                                Raised
                                            </h4>
                                            <h5 className="text-2xl ">
                                                {item.raised}
                                            </h5>
                                        </div>
                                        <div className="">
                                            <h4 className=" text-muted dark:text-white/60 text-sm mb-1">
                                                Goal
                                            </h4>
                                            <h5 className="text-2xl ">
                                                {item.goal}
                                            </h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    )
}

export default CauseList;