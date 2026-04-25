import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";
import { SigninView } from "./SigninView";

export const metadata: Metadata = {
  title: "Connexion | Endeavor",
};

const SigninPage = () => {
  return (
    <>
      <Breadcrumb pageName="Connexion" />
      <SigninView />
    </>
  );
};

export default SigninPage;
