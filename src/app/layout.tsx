import type { Metadata } from "next";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/lib/i18n/language-context";
import { LanguageToggle } from "@/components/vaultify/language-toggle";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vaultify — Zero-Knowledge Secret Sharing",
  description:
    "Wysyłaj hasła, klucze API i poufne wiadomości przez linki, które serwer nigdy nie potrafi odczytać.",
  openGraph: {
    title: "Vaultify — Zero-Knowledge Secret Sharing",
    description:
      "Szyfrowanie AES-256-GCM w przeglądarce. Serwer nigdy nie widzi treści.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl" className="dark">
      <body className="antialiased">
        <LanguageProvider>
          {children}
          <LanguageToggle />
        </LanguageProvider>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#0f0f12",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#f4f4f5",
            },
          }}
        />
      </body>
    </html>
  );
}