import type { Metadata } from "next";
import HeroSub from "@/components/SharedComponent/HeroSub";
import PresenceDeclarationClient from "./PresenceDeclarationClient";

export const metadata: Metadata = {
  title: "Déclaration de présence | INBTP",
};

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PresencePublicPage({ searchParams }: Props) {
  const sp = await searchParams;
  const raw = sp.seanceRef;
  const seanceRefRaw =
    typeof raw === "string" ? raw.trim() : Array.isArray(raw) ? String(raw[0] ?? "").trim() : "";

  return (
    <>
      <HeroSub title="Déclaration de présence" />
      <PresenceDeclarationClient seanceRefRaw={seanceRefRaw} />
    </>
  );
}
