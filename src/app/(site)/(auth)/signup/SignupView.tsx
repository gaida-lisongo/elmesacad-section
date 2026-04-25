"use client";

import { useRouter } from "next/navigation";
import SignUp from "@/components/Auth/SignUp";

export function SignupView() {
  const router = useRouter();

  return (
    <div className="min-h-[70vh] dark:bg-dark">
      <div className="container mx-auto max-w-4xl px-4 py-10 md:max-w-(--breakpoint-md) lg:max-w-(--breakpoint-xl)">
        <SignUp
          onOpenSignIn={() => {
            router.push("/signin");
          }}
        />
      </div>
    </div>
  );
}
