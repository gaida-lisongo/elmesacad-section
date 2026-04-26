import React from "react";
import HeroSub from "@/components/SharedComponent/HeroSub";
import { Metadata } from "next";
import TicketContactForm from "@/components/Ticket/TicketContactForm";

export const metadata: Metadata = {
  title: "Contact | Endeavor",
};

const page = () => {
  return (
    <>
      <HeroSub title="Contact" />
      <TicketContactForm />
    </>
  );
};

export default page;
