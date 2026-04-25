"use client";

import Logo from "@/components/Layout/Header/Logo";
import { AccountRegistrationWizard } from "./AccountRegistrationWizard";
import { Toaster } from "react-hot-toast";

type SignUpProps = {
  signUpOpen?: (open: boolean) => void;
  onOpenSignIn?: () => void;
};

const SignUp = ({ signUpOpen, onOpenSignIn }: SignUpProps) => {
  return (
    <>
      <Toaster position="top-center" />
      <div className="mb-6 text-center">
        <Logo />
      </div>
      <AccountRegistrationWizard
        onClose={() => signUpOpen?.(false)}
        onOpenSignIn={() => onOpenSignIn?.()}
      />
    </>
  );
};

export default SignUp;
