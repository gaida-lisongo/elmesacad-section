import React, { FC } from "react";
import Image from "next/image";
import { Blog } from "@/types/blog";
import { format } from "date-fns";
import Link from "next/link";

const BlogCard = ({ blog }: { blog: Blog }) => {
    const { title, coverImage, excerpt, date, slug } = blog;
    return (
        <>
            <Link href={`/blog/${slug}`} className="group mb-0 grid grid-cols-12 lg:gap-9 gap-6">
                <div className="overflow-hidden rounded-lg lg:col-span-5 col-span-12">
                    <Image 
                        src={coverImage}
                        alt="image"
                        width={300}
                        height={250}
                        style={{height:"auto",width:"100%"}}
                        className="group-hover:scale-110 duration-300 "
                    />
                </div>
                <div className="lg:col-span-7 col-span-12">
                    <span className="text-base text-gray-400 mb-1">
                        {format(new Date(date), "MMM dd yyyy")}
                    </span>
                    <h5 className="text-[22px] leading-tight font-medium mb-9 group-hover:text-primary">
                        {title}
                    </h5>
                    <p className="text-primary text-base font-medium ">
                        Read More
                    </p>
                </div>
            </Link>
        </>
    );
};

export default BlogCard;