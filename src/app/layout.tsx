import type { Metadata } from "next";
import { Toaster } from "sonner";
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
    // className="dark" wymusza nasz obsydianowy motyw z Kroku 4.1
    // na stałe, niezależnie od ustawień systemowych użytkownika.
    <html lang="pl" className="dark">
      <body className="antialiased">
        {children}
        {/* Toaster z sonner — komponent renderujący powiadomienia
            w prawym dolnym rogu, wywoływane przez funkcję toast()
            gdziekolwiek w aplikacji. */}
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