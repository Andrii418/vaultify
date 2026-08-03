"use client";

import { motion } from "framer-motion";

/**
 * Szacuje entropię hasła w bitach na podstawie wykorzystanych
 * kategorii znaków (małe/wielkie litery, cyfry, symbole).
 */
function estimateEntropyBits(password: string): number {
  if (!password) return 0;

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) return 0;

  return password.length * Math.log2(poolSize);
}

/**
 * Liczy, ile z 4 kategorii znaków (małe litery, wielkie litery,
 * cyfry, symbole) faktycznie występuje w haśle. Samo dużo bitów
 * entropii nie wystarczy — hasło "00000000000000" ma sporo entropii
 * matematycznej, ale jest banalnie przewidywalne, bo atakujący
 * próbuje wzorców i powtórzeń na długo przed czystym brute-force.
 */
function countCharacterCategories(password: string): number {
  let count = 0;
  if (/[a-z]/.test(password)) count++;
  if (/[A-Z]/.test(password)) count++;
  if (/[0-9]/.test(password)) count++;
  if (/[^a-zA-Z0-9]/.test(password)) count++;
  return count;
}

/**
 * Wykrywa oczywiste wzorce, które drastycznie ułatwiają odgadnięcie
 * hasła, mimo pozornie wysokiej entropii:
 * - ten sam znak powtórzony 3+ razy z rzędu (np. "aaa", "111")
 * - proste sekwencje rosnące/malejące (np. "1234", "abcd")
 */
function hasObviousPattern(password: string): boolean {
  // 3 lub więcej identycznych znaków pod rząd
  if (/(.)\1{2,}/.test(password)) return true;

  // Sekwencje rosnące/malejące długości 4+ (cyfry lub litery)
  const sequences = "0123456789abcdefghijklmnopqrstuvwxyz";
  const lower = password.toLowerCase();

  for (let i = 0; i <= lower.length - 4; i++) {
    const chunk = lower.slice(i, i + 4);
    if (sequences.includes(chunk)) return true;
    if (sequences.includes([...chunk].reverse().join(""))) return true;
  }

  return false;
}

interface StrengthLevel {
  label: string;
  colorClass: string;
  barColorClass: string;
}

function getStrengthLevel(
  bits: number,
  categoryCount: number,
  hasPattern: boolean
): StrengthLevel {
  if (bits === 0) {
    return { label: "", colorClass: "", barColorClass: "" };
  }

  // Oczywisty wzorzec (powtórzenia, sekwencje) — zawsze traktujemy
  // jako słabe, niezależnie od tego, ile "matematycznej" entropii
  // wyszłoby z samej długości i alfabetu.
  if (hasPattern) {
    return {
      label: "Słabe (przewidywalny wzorzec)",
      colorClass: "text-destructive",
      barColorClass: "bg-destructive",
    };
  }

  if (bits < 28) {
    return {
      label: "Bardzo słabe",
      colorClass: "text-destructive",
      barColorClass: "bg-destructive",
    };
  }
  if (bits < 36) {
    return {
      label: "Słabe",
      colorClass: "text-destructive",
      barColorClass: "bg-destructive/80",
    };
  }
  if (bits < 60) {
    return {
      label: "Umiarkowane",
      colorClass: "text-primary",
      barColorClass: "bg-primary",
    };
  }

  // "Silne" i "Bardzo silne" DODATKOWO wymagają zróżnicowanych
  // kategorii znaków — sama wysoka entropia z jednej kategorii
  // (np. bardzo długi ciąg cyfr) nie wystarczy.
  if (bits < 80 || categoryCount < 3) {
    return {
      label: "Silne",
      colorClass: "text-accent",
      barColorClass: "bg-accent",
    };
  }

  if (categoryCount < 4) {
    return {
      label: "Silne",
      colorClass: "text-accent",
      barColorClass: "bg-accent",
    };
  }

  return {
    label: "Bardzo silne",
    colorClass: "text-accent",
    barColorClass: "bg-accent",
  };
}

export function PasswordStrengthMeter({ password }: { password: string }) {
  const bits = estimateEntropyBits(password);
  const categoryCount = countCharacterCategories(password);
  const hasPattern = hasObviousPattern(password);
  const level = getStrengthLevel(bits, categoryCount, hasPattern);

  const fillPercent = hasPattern
    ? 15 // wizualnie zawsze pokazujemy niski pasek przy wykrytym wzorcu
    : Math.min(100, (bits / 80) * 100);

  if (!password) return null;

  return (
    <div className="mt-2 space-y-1.5">
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${fillPercent}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className={`h-full rounded-full ${level.barColorClass}`}
        />
      </div>
      <div className="flex items-center justify-between text-xs gap-2">
        <span className={level.colorClass}>{level.label}</span>
        <span className="font-mono-vaultify text-muted-foreground shrink-0">
          {Math.round(bits)} bitów
        </span>
      </div>
      {/* Wskazówka, czego brakuje do wyższego poziomu — widoczna
          tylko gdy hasło nie jest jeszcze "Bardzo silne" i nie ma
          oczywistego wzorca (bo wtedy priorytetem jest usunięcie
          wzorca, nie dodawanie kategorii) */}
      {!hasPattern && categoryCount < 4 && bits >= 36 && (
        <p className="text-[11px] text-muted-foreground">
          Dodaj {categoryCount < 2 && "małe i wielkie litery, "}
          {categoryCount < 3 && "cyfry, "}
          {categoryCount < 4 && "znaki specjalne "}
          dla wyższej oceny.
        </p>
      )}
    </div>
  );
}