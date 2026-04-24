import SignUp from "@/components/Auth/SignUp";
import Breadcrumb from "@/components/Common/Breadcrumb";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up | Endeavor",
};

const SignupPage = () => {
  return (
    <>
      <Breadcrumb pageName="Sign Up Page" />

      <div className="dark:bg-dark">
        <div className="px-4 container mx-auto lg:max-w-(--breakpoint-xl) md:max-w-(--breakpoint-md) py-5">
          <SignUp />
        </div>
      </div>
    </>
  );
};

export default SignupPage;
