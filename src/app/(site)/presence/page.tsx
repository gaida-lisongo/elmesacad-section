import type { Metadata } from "next";
import HeroSub from "@/components/SharedComponent/HeroSub";
import PresenceDeclarationClient from "./PresenceDeclarationClient";

export const metadata: Metadata = {
  title: "Déclaration de présence | INBTP",
};

export default function PresencePublicPage() {
  return (
    <>
      <HeroSub title="Déclaration de présence" />
      <PresenceDeclarationClient />
    </>
  );
}

