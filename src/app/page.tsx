import { SecretComposer } from "@/components/vaultify/secret-composer";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16 sm:py-24">
      <SecretComposer />
    </main>
  );
}