export type Locale = "pl" | "en";

export const translations: Record<Locale, Record<string, string>> = {
  pl: {
    // ---------- Hero (strona główna) ----------
    "hero.badge": "Zero-Knowledge · AES-256-GCM · Otwarte źródło",
    "hero.title1": "Udostępnij sekret,",
    "hero.title2": "którego nikt nie podejrzy.",
    "hero.subtitle":
      "Hasła, klucze API, poufne wiadomości — szyfrowane w Twojej przeglądarce, zanim cokolwiek trafi na nasz serwer. My też nigdy nie zobaczymy treści.",
    "hero.demoLabelPlain": "Twoja treść",
    "hero.demoLabelCipher": "Zaszyfrowane w Twojej przeglądarce",
    "hero.ctaCreate": "Stwórz bezpieczny link",
    "hero.ctaHowItWorks": "Jak to działa?",
    "hero.ctaGithub": "Zobacz kod źródłowy",
    "hero.trustEncryption": "AES-256-GCM",
    "hero.trustBurn": "Samozniszczenie po odczycie",
    "hero.trustBlind": "Serwer nigdy nie widzi treści",

    // ---------- Jak to działa ----------
    "how.eyebrow": "Jak to działa",
    "how.title": "Trzy kroki, zero zaufania do serwera",
    "how.step1.title": "Piszesz i szyfrujesz lokalnie",
    "how.step1.desc":
      "Treść jest szyfrowana algorytmem AES-256-GCM bezpośrednio w Twojej przeglądarce, zanim cokolwiek zostanie wysłane do sieci.",
    "how.step2.title": "Wysyłasz jeden link",
    "how.step2.desc":
      "Klucz deszyfrujący trafia do fragmentu adresu URL — przeglądarki z definicji nigdy nie wysyłają go do serwera.",
    "how.step3.title": "Sekret znika po odczycie",
    "how.step3.desc":
      "Odbiorca otwiera link, treść odszyfrowuje się w jego przeglądarce, a baza danych natychmiast usuwa sekret na zawsze.",
  },

  en: {
    // ---------- Hero (home page) ----------
    "hero.badge": "Zero-Knowledge · AES-256-GCM · Open Source",
    "hero.title1": "Share a secret",
    "hero.title2": "no one else can peek at.",
    "hero.subtitle":
      "Passwords, API keys, confidential messages — encrypted in your browser before anything reaches our server. We never see the content either.",
    "hero.demoLabelPlain": "Your content",
    "hero.demoLabelCipher": "Encrypted in your browser",
    "hero.ctaCreate": "Create a secure link",
    "hero.ctaHowItWorks": "How it works?",
    "hero.ctaGithub": "View source code",
    "hero.trustEncryption": "AES-256-GCM",
    "hero.trustBurn": "Self-destructs after reading",
    "hero.trustBlind": "Server never sees the content",

    // ---------- How it works ----------
    "how.eyebrow": "How it works",
    "how.title": "Three steps, zero server trust",
    "how.step1.title": "You write and encrypt locally",
    "how.step1.desc":
      "Content is encrypted with AES-256-GCM directly in your browser, before anything is sent over the network.",
    "how.step2.title": "You send a single link",
    "how.step2.desc":
      "The decryption key lives in the URL fragment — browsers never send it to the server, by design.",
    "how.step3.title": "The secret disappears after reading",
    "how.step3.desc":
      "The recipient opens the link, the content decrypts in their browser, and the database instantly deletes the secret forever.",
  },
};