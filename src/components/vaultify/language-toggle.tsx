"use client";

import { useLanguage } from "@/lib/i18n/language-context";

export function LanguageToggle() {
  const { locale, setLocale } = useLanguage();

  return (
    <div className="fixed top-4 right-4 z-50 inline-flex rounded-full border border-white/10 bg-black/40 backdrop-blur-md p-1 text-xs font-mono-vaultify">
      <button
        onClick={() => setLocale("pl")}
        className={`px-3 py-1.5 rounded-full transition-colors ${
          locale === "pl"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        PL
      </button>
      <button
        onClick={() => setLocale("en")}
        className={`px-3 py-1.5 rounded-full transition-colors ${
          locale === "en"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
    </div>
  );
}