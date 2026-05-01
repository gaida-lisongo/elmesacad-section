import React from "react";
import { Metadata } from "next";
import Breadcrumb from "@/components/Common/Breadcrumb";
import TicketContactForm from "@/components/Ticket/TicketContactForm";

export const metadata: Metadata = {
  title: "Contact | Endeavor",
};

const page = () => {
  return (
    <>
      <Breadcrumb
        pageName="Contact"
        pageDescription="Soumettez votre demande au support et recevez une reference pour suivre votre ticket."
      />
      <TicketContactForm />
    </>
  );
};

export default page;
