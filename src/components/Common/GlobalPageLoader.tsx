"use client";

import { motion } from "framer-motion";

export default function GlobalPageLoader() {
  return (
    <div className="flex min-h-[45vh] w-full items-center justify-center py-14">
      <div className="flex flex-col items-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-14 w-14 rounded-full border-4 border-primary/20 border-t-primary"
        />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">Chargement en cours...</p>
      </div>
    </div>
  );
}
