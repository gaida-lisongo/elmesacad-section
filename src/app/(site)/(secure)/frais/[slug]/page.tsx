import { notFound } from "next/navigation";
import { connectDB } from "@/lib/services/connectedDB";
import { FraisModel } from "@/lib/models/Frais";
import ModalitesClient from "@/app/(site)/(secure)/frais/[slug]/ModalitesClient";

export const dynamic = "force-dynamic";

type Props = {
    params: Promise<{ slug: string }>;
};

export default async function FraisDetailPage({ params }: Props) {
    const { slug } = await params;

    await connectDB();
    const frais = await FraisModel.findOne({ slug: slug.trim() }).populate("annee").lean();

    if (!frais) {
        notFound();
    }

    const serializedFrais = JSON.parse(JSON.stringify(frais));

    return (
        <ModalitesClient
            frais={serializedFrais}
        />
    );
}
