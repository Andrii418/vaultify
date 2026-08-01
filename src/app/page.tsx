import { LandingHero } from "@/components/vaultify/landing-hero";
import { HowItWorks } from "@/components/vaultify/how-it-works";
import { SecretComposer } from "@/components/vaultify/secret-composer";

export default function HomePage() {
  return (
    <main className="min-h-screen">
      <LandingHero />
      <HowItWorks />
      <section id="composer" className="px-4 py-20 sm:py-28">
        <SecretComposer />
      </section>
    </main>
  );
} 