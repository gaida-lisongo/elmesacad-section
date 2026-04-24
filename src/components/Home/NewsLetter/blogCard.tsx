import Image from "next/image";
import { Blog } from "@/types/blog";
import { format } from "date-fns";
import Link from "next/link";

const BlogCard = ({ blog }: { blog: Blog }) => {
    const { title, coverImage, excerpt, date, slug } = blog;
    return (
        <>
            <Link href={`/blog/${slug}`} className="group flex items-center gap-8">
                <div className="overflow-hidden rounded-sm">
                    <Image
                        src={coverImage!}
                        alt="image"
                        width={150}
                        height={100}
                        className="group-hover:scale-110 duration-300"
                    />
                </div>
                <div className="">
                    <h4 className="font-medium text-lg group-hover:text-primary mb-3">
                        {title}
                    </h4>
                    <p className="text-muted dark:text-white/60 text-base">
                        by Mark Freeman / 23 May 2024
                    </p>
                </div>
            </Link>
        </>
    )
}

export default BlogCard;