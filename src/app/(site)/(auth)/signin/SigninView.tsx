"use client";

import { motion } from "framer-motion";
import { OtpSignInFlow } from "@/components/Auth/SignIn/OtpSignInFlow";

export function SigninView() {
  return (
    <div className="min-h-[70vh] pb-16 dark:bg-dark">
      <div className="container mx-auto max-w-(--breakpoint-xl) px-4 py-10">
        <div className="grid items-stretch gap-6 lg:grid-cols-12">
          <motion.div
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-darklight lg:col-span-5"
          >
            <img src="/images/inbtp/jpg/img-16.jpg" alt="Connexion INBTP" className="h-full min-h-[640px] w-full object-cover" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, ease: "easeOut", delay: 0.05 }}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-darklight lg:col-span-7"
          >
            <OtpSignInFlow />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
