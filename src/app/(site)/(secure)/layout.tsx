import HeroSub from "@/components/SharedComponent/HeroSub";
import Volunteer from "@/components/SharedComponent/Volunteer";

export default function SecureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeroSub />

      <main className="py-12 lg:py-16">
        <section className="container mx-auto lg:max-w-(--breakpoint-xl) px-4">
          {children}
        </section>
      </main>

      <div className="mt-16 lg:mt-20">
        <Volunteer />
      </div>
    </>
  );
}
