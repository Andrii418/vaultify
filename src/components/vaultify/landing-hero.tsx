"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Lock, Flame, ChevronDown } from "lucide-react";
import Link from "next/link";

const DEMO_PLAINTEXT = "hasło_do_serwera_produkcyjnego";
const CIPHER_CHARS = "ABCDEF0123456789-_abcdef";

function scrambleLike(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    out += CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
  }
  return out;
}

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function LandingHero() {
  const [showCiphertext, setShowCiphertext] = useState(false);
  const [scrambled, setScrambled] = useState(() => scrambleLike(DEMO_PLAINTEXT));

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setShowCiphertext((prev) => !prev);
    }, 2200);

    const scrambleInterval = setInterval(() => {
      setScrambled(scrambleLike(DEMO_PLAINTEXT));
    }, 90);

    return () => {
      clearInterval(phaseInterval);
      clearInterval(scrambleInterval);
    };
  }, []);

  function scrollToComposer() {
    document.getElementById("composer")?.scrollIntoView({ behavior: "smooth" });
  }

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center px-4 py-20 overflow-hidden">
      <div
        className="absolute inset-0 -z-10 opacity-60"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(240,168,104,0.10), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 font-mono-vaultify text-xs uppercase tracking-wider text-accent mb-6 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02]"
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Zero-Knowledge - AES-256-GCM - Otwarte zrodlo
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="text-5xl sm:text-6xl font-semibold tracking-tight text-center text-foreground max-w-2xl"
      >
        Udostepnij sekret,
        <br />
        <span className="text-primary">ktorego nikt nie podejrzy.</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mt-5 text-muted-foreground text-lg text-center max-w-lg"
      >
        Hasla, klucze API, poufne wiadomosci - szyfrowane w Twojej
        przegladarce, zanim cokolwiek trafi na nasz serwer. My tez nigdy nie
        zobaczymy tresci.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="glass-panel rounded-2xl px-6 py-5 mt-10 w-full max-w-md"
      >
        <div className="flex items-center gap-2 mb-3 text-xs font-mono-vaultify text-muted-foreground uppercase tracking-wider">
          {showCiphertext ? (
            <>
              <Lock className="w-3.5 h-3.5 text-accent" />
              Zaszyfrowane w Twojej przegladarce
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Twoja tresc
            </>
          )}
        </div>
        <AnimatePresence mode="wait">
          <motion.p
            key={showCiphertext ? "cipher" : "plain"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={"font-mono-vaultify text-sm break-all " + (showCiphertext ? "text-accent/80" : "text-foreground")}
          >
            {showCiphertext ? scrambled : DEMO_PLAINTEXT}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="mt-10 flex flex-col sm:flex-row items-center gap-4"
      >
        <button
          onClick={scrollToComposer}
          className="px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
        >
          Stworz bezpieczny link
        </button>
        <Link
          href="/how-it-works"
          className="px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Jak to dziala?
        </Link>
        
          <a href="https://github.com/Andrii418/vaultify"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-3 rounded-xl border border-white/10 hover:border-white/20 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <GithubIcon className="w-4 h-4" />
          Zobacz kod zrodlowy
        </a>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-14 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-muted-foreground font-mono-vaultify"
      >
        <span className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          AES-256-GCM
        </span>
        <span className="flex items-center gap-1.5">
          <Flame className="w-3.5 h-3.5" />
          Samozniszczenie po odczycie
        </span>
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Serwer nigdy nie widzi tresci
        </span>
      </motion.div>

      <motion.button
        onClick={scrollToComposer}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 6, 0] }}
        transition={{
          opacity: { duration: 0.5, delay: 0.8 },
          y: { duration: 1.6, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute bottom-8 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Przewin w dol"
      >
        <ChevronDown className="w-6 h-6" />
      </motion.button>
    </section>
  );
}
