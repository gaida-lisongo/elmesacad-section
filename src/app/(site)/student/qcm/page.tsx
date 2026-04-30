import type { Metadata } from "next";
import HeroSub from "@/components/SharedComponent/HeroSub";
import QcmResolutionClient from "./QcmResolutionClient";

export const metadata: Metadata = {
  title: "Soumission QCM | INBTP",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentQcmPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = sp.activiteId;
  const activiteIdRaw =
    typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
  return (
    <>
      <HeroSub title="Soumission QCM" />
      <QcmResolutionClient activiteIdRaw={activiteIdRaw} />
    </>
  );
}
