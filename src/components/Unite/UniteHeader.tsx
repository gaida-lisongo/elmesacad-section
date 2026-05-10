"use client";

const UniteHeader = ({ designation, code, description }: { designation: string; code: string; description: string }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase">
          {code}
        </span>
      </div>
      <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight">
        {designation}
      </h1>
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};


export default UniteHeader;