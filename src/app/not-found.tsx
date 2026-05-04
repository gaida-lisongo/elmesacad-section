import NotFound from "@/components/NotFound";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page introuvable | INBTP",
};

const ErrorPage = () => {
  return <NotFound />;
};

export default ErrorPage;
