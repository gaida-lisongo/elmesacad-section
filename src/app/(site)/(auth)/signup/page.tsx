import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";
import { SignupView } from "./SignupView";

export const metadata: Metadata = {
  title: "Inscription | Endeavor",
};

const SignupPage = () => {
  return (
    <>
      <Breadcrumb pageName="Inscription" />
      <SignupView />
    </>
  );
};

export default SignupPage;
