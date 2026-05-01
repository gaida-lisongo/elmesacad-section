import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";
import { SignupView } from "./SignupView";

export const metadata: Metadata = {
  title: "Inscription | Endeavor",
};

const SignupPage = () => {
  return (
    <>
      <Breadcrumb
        pageName="Inscription"
        pageDescription="Creez votre compte pour acceder aux services de la plateforme."
      />
      <SignupView />
    </>
  );
};

export default SignupPage;
