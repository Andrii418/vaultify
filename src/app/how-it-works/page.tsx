"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Lock, Database, Unlock, KeyRound } from "lucide-react";
import { ZeroKnowledgeDiagram } from "@/components/vaultify/zero-knowledge-diagram";

const DETAILS = [
  {
    icon: Lock,
    title: "Dlaczego IV jest inny za każdym razem",
    description:
      "Każde szyfrowanie AES-GCM generuje świeży, losowy wektor inicjalizujący (IV). Użycie tego samego IV dwukrotnie z tym samym kluczem złamałoby bezpieczeństwo trybu GCM — dlatego IV nigdy nie jest ponownie wykorzystywany.",
  },
  {
    icon: KeyRound,
    title: "Dlaczego klucz nigdy nie trafia do bazy",
    description:
      "Fragment adresu URL (część po znaku #) z definicji nie jest wysyłany do serwera w żądaniu HTTP — to standard przeglądarek od lat 90. Umieszczając tam klucz, wykorzystujemy tę właściwość jako naturalny 'tunel' poza zasięgiem serwera.",
  },
  {
    icon: Database,
    title: "Co przechowuje baza danych",
    description:
      "Wyłącznie zaszyfrowany bełkot (ciphertext), IV oraz metadane (czas wygaśnięcia, czy sekret jest chroniony hasłem). Reguły Row Level Security dodatkowo blokują jakikolwiek bezpośredni odczyt — jedyną drogą jest kontrolowana funkcja atomowa.",
  },
  {
    icon: Unlock,
    title: "Co dzieje się po odczycie",
    description:
      "Odczyt i usunięcie sekretu zachodzą w jednej, niepodzielnej transakcji SQL (SELECT ... FOR UPDATE). To gwarantuje, że nawet dwie równoczesne próby otwarcia tego samego linku nie doprowadzą do podwójnego odczytu.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="min-h-screen px-4 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Powrót do Vaultify
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="font-mono-vaultify text-xs uppercase tracking-wider text-accent">
            Architektura
          </span>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-foreground mt-3">
            Jak działa Zero-Knowledge w Vaultify
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl mx-auto">
            Klucz deszyfrujący i zaszyfrowana treść podróżują dwiema
            zupełnie oddzielnymi drogami — tylko jedna z nich prowadzi
            przez nasz serwer.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="glass-panel rounded-2xl p-6 sm:p-10 mb-16"
        >
          <ZeroKnowledgeDiagram />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {DETAILS.map((item, index) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-5"
              >
                <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-medium text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center mt-16"
        >
          <Link
            href="/#composer"
            className="inline-block px-6 py-3 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-colors"
          >
            Wypróbuj Vaultify
          </Link>
        </motion.div>
      </div>
    </main>
  );
}