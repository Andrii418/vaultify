"use client";

import { motion } from "framer-motion";
import { PenLine, Link2, Flame } from "lucide-react";

const STEPS = [
  {
    icon: PenLine,
    title: "Piszesz i szyfrujesz lokalnie",
    description:
      "Treść jest szyfrowana algorytmem AES-256-GCM bezpośrednio w Twojej przeglądarce, zanim cokolwiek zostanie wysłane do sieci.",
  },
  {
    icon: Link2,
    title: "Wysyłasz jeden link",
    description:
      "Klucz deszyfrujący trafia do fragmentu adresu URL — przeglądarki z definicji nigdy nie wysyłają go do serwera.",
  },
  {
    icon: Flame,
    title: "Sekret znika po odczycie",
    description:
      "Odbiorca otwiera link, treść odszyfrowuje się w jego przeglądarce, a baza danych natychmiast usuwa sekret na zawsze.",
  },
];

export function HowItWorks() {
  return (
    <section className="px-4 py-20 sm:py-28">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="text-center mb-14"
      >
        <span className="font-mono-vaultify text-xs uppercase tracking-wider text-accent">
          Jak to działa
        </span>
        <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-3">
          Trzy kroki, zero zaufania do serwera
        </h2>
      </motion.div>

      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-6">
        {STEPS.map((step, index) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: index * 0.12 }}
              className="glass-panel rounded-2xl p-6"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <span className="font-mono-vaultify text-xs text-muted-foreground">
                Krok {index + 1}
              </span>
              <h3 className="text-base font-medium text-foreground mt-1 mb-2">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.description}
              </p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}