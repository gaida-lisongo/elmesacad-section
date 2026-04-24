import { helpdata } from "@/app/api/data";
import Image from 'next/image';

const Help = () => {
    return (
        <section className="lg:py-28 py-16 bg-white dark:bg-dark">
            <div className="container mx-auto lg:max-w-(--breakpoint-xl) px-4">
                <div className="text-center">
                    <h2 className="text-3xl mb-3 font-medium" data-aos-delay={'100'} data-aos="fade-right">
                        How can you help us?
                    </h2>
                    <p className="text-muted dark:text-white/60 text-base">
                    You can support us by donating, volunteering your time, or providing food supplies.<br className="lg:block hidden" /> Every effort makes a difference!
                    </p>
                    <div className="mt-20 grid grid-cols-12 gap-8">
                        {helpdata.map((item, index) => (
                            <div key={index} className="md:col-span-4 sm:col-span-6 col-span-12 text-center flex flex-col gap-5 justify-center" data-aos="fade-up" data-aos-delay={`${index * 150}`}>
                                <div className="flex justify-center">
                                    <Image
                                        src={item.icon}
                                        alt="icon"
                                        width={64}
                                        height={64}
                                    />
                                </div>
                                <h4 className="text-lg font-medium">
                                    {item.title}
                                </h4>
                                <p className="text-muted dark:text-white/60 text-base">
                                    {item.text}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
export default Help;