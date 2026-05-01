import SecureBreadcrumbHero from "@/components/Common/SecureBreadcrumbHero";

export default function SecureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SecureBreadcrumbHero />

      <main className="py-12 lg:py-16">
        <section className="mx-auto w-full max-w-none px-4 sm:px-6 lg:px-8">
          {children}
        </section>
      </main>
    </>
  );
}
