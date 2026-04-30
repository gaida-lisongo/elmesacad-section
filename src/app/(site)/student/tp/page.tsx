import type { Metadata } from "next";
import HeroSub from "@/components/SharedComponent/HeroSub";
import TpResolutionClient from "./TpResolutionClient";

export const metadata: Metadata = {
  title: "Soumission TP | INBTP",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StudentTpPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = sp.activiteId;
  const activiteIdRaw =
    typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";
  return (
    <>
      <HeroSub title="Soumission TP" />
      <TpResolutionClient activiteIdRaw={activiteIdRaw} />
    </>
  );
}
