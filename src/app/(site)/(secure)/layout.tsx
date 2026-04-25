import HeroSub from "@/components/SharedComponent/HeroSub";
import Volunteer from "@/components/SharedComponent/Volunteer";

export default function SecureLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <HeroSub title="Secure Workspace" />

      <main className="py-16 lg:py-20">
        <section className="container mx-auto lg:max-w-(--breakpoint-xl) px-4">
          <div className="mb-8 rounded-xl border border-[#082b1c]/20 bg-[#082b1c]/5 px-4 py-3">
            <h1 className="text-lg font-bold text-[#082b1c]">Gestion metier securisee</h1>
            <p className="text-sm text-body-color">
              Agents, etudiants, sections, dashboard et tickets.
            </p>
          </div>

          {children}
        </section>
      </main>

      <div className="mt-16 lg:mt-20">
        <Volunteer />
      </div>
    </>
  );
}
