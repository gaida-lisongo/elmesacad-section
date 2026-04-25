import SectionDetailView from "@/app/(site)/(secure)/sections/_components/SectionDetailView";
import { notFound } from "next/navigation";

export default async function SectionDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!slug?.trim()) {
    notFound();
  }
  return <SectionDetailView slug={decodeURIComponent(slug)} />;
}
