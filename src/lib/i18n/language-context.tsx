"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { translations, Locale } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

const STORAGE_KEY = "vaultify-locale";

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Domyślnie polski — dopiero po zamontowaniu w przeglądarce
  // sprawdzamy zapisaną wcześniej preferencję w localStorage.
  const [locale, setLocaleState] = useState<Locale>("pl");

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "pl" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  function setLocale(next: Locale) {
    setLocaleState(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  function t(key: string): string {
    return translations[locale][key] ?? translations.pl[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

/**
 * Hook używany w komponentach do pobrania funkcji tłumaczącej `t()`
 * oraz aktualnego/zmienianego języka. Rzuca błąd, jeśli użyty poza
 * <LanguageProvider> — to celowe zabezpieczenie przed pomyłką.
 */
export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider.");
  }
  return context;
}