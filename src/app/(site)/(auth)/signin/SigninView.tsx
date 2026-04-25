"use client";

import { OtpSignInFlow } from "@/components/Auth/SignIn/OtpSignInFlow";

export function SigninView() {
  return (
    <div className="min-h-[70vh] dark:bg-dark">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-xl)">
        <OtpSignInFlow />
      </div>
    </div>
  );
}
