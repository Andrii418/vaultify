"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldAlert,
  ShieldOff,
  Flame,
  Lock,
  Copy,
  Check,
  Loader2,
  KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { decryptSecret } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/client";
import type { BurnedSecretResult } from "@/lib/supabase/types";

// Możliwe stany, w jakich może znajdować się ta strona.
type ViewState =
  | "loading" // Trwa pierwsze zapytanie do bazy (sprawdzamy czy sekret istnieje)
  | "needs-password" // Sekret istnieje, ale wymaga hasła do odszyfrowania
  | "decrypting" // Trwa deszyfrowanie (po podaniu hasła albo od razu)
  | "revealed" // Sukces — treść jest widoczna
  | "not-found" // RPC zwróciło SECRET_NOT_FOUND
  | "expired" // RPC zwróciło SECRET_EXPIRED
  | "already-viewed" // RPC zwróciło SECRET_ALREADY_VIEWED
  | "missing-key" // Brak #k=... w URL, a sekret nie jest chroniony hasłem
  | "wrong-password"; // Hasło zostało podane, ale deszyfrowanie się nie udało

export default function SecretViewPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>("loading");
  const [decryptedText, setDecryptedText] = useState<string>("");
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  // Przechowujemy surowy wynik z RPC między próbami — potrzebne,
  // żeby po nieudanej próbie hasła spróbować ponownie BEZ drugiego
  // wywołania RPC (bo drugie wywołanie i tak zwróciłoby błąd —
  // sekret bez `burn_after_reading=false` już nie istnieje po
  // pierwszym udanym pobraniu z bazy!).
  const [burnedPayload, setBurnedPayload] = useState<BurnedSecretResult | null>(
    null
  );
  const [keyFromUrl, setKeyFromUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    async function fetchAndAttemptDecrypt() {
      // Fragment URL (#k=...) jest dostępny WYŁĄCZNIE w przeglądarce,
      // nigdy na serwerze — dlatego ten kod musi być w useEffect,
      // które uruchamia się tylko po stronie klienta.
      const hash = window.location.hash; // np. "#k=xY9z..."
      const extractedKey = hash.startsWith("#k=")
        ? hash.slice(3)
        : undefined;
      setKeyFromUrl(extractedKey);

      const supabase = createClient();
      const { data, error } = await supabase
        .rpc("get_and_burn_secret", { secret_id: params.id })
        .single<BurnedSecretResult>();

      if (error) {
        // Rozpoznajemy nasze własne, nazwane błędy z funkcji SQL
        if (error.message.includes("SECRET_NOT_FOUND")) {
          setState("not-found");
        } else if (error.message.includes("SECRET_EXPIRED")) {
          setState("expired");
        } else if (error.message.includes("SECRET_ALREADY_VIEWED")) {
          setState("already-viewed");
        } else {
          setState("not-found"); // domyślny, bezpieczny fallback
        }
        return;
      }

      setBurnedPayload(data);

      if (data.is_password_protected) {
        // Czekamy, aż użytkownik wpisze hasło — nie próbujemy
        // deszyfrować jeszcze niczego.
        setState("needs-password");
        return;
      }

      if (!extractedKey) {
        // Sekret NIE jest chroniony hasłem, ale w URL brakuje klucza —
        // to oznacza niekompletny/uszkodzony link.
        setState("missing-key");
        return;
      }

      // Mamy wszystko czego potrzeba — deszyfrujemy od razu.
      try {
        const plaintext = await decryptSecret(
          {
            ciphertext: data.ciphertext,
            iv: data.iv,
            salt: data.salt,
            isPasswordProtected: data.is_password_protected,
          },
          extractedKey
        );
        setDecryptedText(plaintext);
        setState("revealed");
      } catch {
        setState("wrong-password");
      }
    }

    fetchAndAttemptDecrypt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  async function handlePasswordSubmit() {
    if (!burnedPayload || !password) return;

    setState("decrypting");
    try {
      const plaintext = await decryptSecret(
        {
          ciphertext: burnedPayload.ciphertext,
          iv: burnedPayload.iv,
          salt: burnedPayload.salt,
          isPasswordProtected: burnedPayload.is_password_protected,
        },
        keyFromUrl,
        password
      );
      setDecryptedText(plaintext);
      setState("revealed");
    } catch {
      // Złe hasło — wracamy do formularza, żeby spróbować ponownie.
      // WAŻNE: sam sekret już został "spalony" po stronie bazy przy
      // pierwszym odczycie (jeśli burn_after_reading=true), ale my
      // wciąż mamy jego zaszyfrowaną treść lokalnie w `burnedPayload`,
      // więc kolejne próby hasła nie wymagają nowego zapytania do bazy.
      setState("needs-password");
      toast.error("Nieprawidłowe hasło. Spróbuj ponownie.");
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    toast.success("Skopiowano do schowka.");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          <AnimatePresence mode="wait">
            {/* ---------- ŁADOWANIE ---------- */}
            {state === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center gap-4 py-8"
              >
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  Sprawdzanie linku...
                </p>
              </motion.div>
            )}

            {/* ---------- WYMAGANE HASŁO ---------- */}
            {(state === "needs-password" || state === "decrypting") && (
              <motion.div
                key="password"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center space-y-5"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <KeyRound className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-medium mb-1">
                    Ten sekret jest chroniony hasłem
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Poproś nadawcę o hasło, jeśli go nie znasz.
                  </p>
                </div>
                <div className="space-y-3">
                  <Input
                    type="password"
                    placeholder="Wpisz hasło"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handlePasswordSubmit()}
                    className="bg-black/30 border-white/10 text-center"
                    disabled={state === "decrypting"}
                    autoFocus
                  />
                  <Button
                    onClick={handlePasswordSubmit}
                    disabled={!password || state === "decrypting"}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                  >
                    {state === "decrypting" ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Odszyfrowywanie...
                      </>
                    ) : (
                      "Odszyfruj"
                    )}
                  </Button>
                </div>
              </motion.div>
            )}

            {/* ---------- SUKCES: TREŚĆ ODSŁONIĘTA ---------- */}
            {state === "revealed" && (
              <motion.div
                key="revealed"
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-5"
              >
                <div className="flex items-center gap-2 text-accent text-xs font-mono-vaultify uppercase tracking-wider">
                  <Flame className="w-3.5 h-3.5" />
                  Ten sekret został właśnie zniszczony na serwerze
                </div>

                {/* Efekt odsłonięcia: tekst "wywija się" z rozmycia */}
                <motion.div
                  initial={{ filter: "blur(8px)", opacity: 0 }}
                  animate={{ filter: "blur(0px)", opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className="rounded-xl border border-white/10 bg-black/30 p-4"
                >
                  <p className="font-mono-vaultify text-sm whitespace-pre-wrap break-words text-foreground/95">
                    {decryptedText}
                  </p>
                </motion.div>

                <Button
                  onClick={handleCopy}
                  variant="secondary"
                  className="w-full bg-white/5 hover:bg-white/10 h-11"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Check className="w-4 h-4 text-accent" /> Skopiowano
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        className="flex items-center gap-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <Copy className="w-4 h-4" /> Kopiuj do schowka
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Ten link nie zadziała ponownie — zapisz treść, jeśli jej
                  potrzebujesz.
                </p>
              </motion.div>
            )}

            {/* ---------- BŁĘDY ---------- */}
            {state === "not-found" && (
              <ErrorState
                icon={<ShieldOff className="w-6 h-6 text-destructive" />}
                title="Sekret nie istnieje"
                description="Ten link jest nieprawidłowy lub sekret został już usunięty."
              />
            )}
            {state === "expired" && (
              <ErrorState
                icon={<ShieldAlert className="w-6 h-6 text-destructive" />}
                title="Link wygasł"
                description="Czas życia tego sekretu już minął. Poproś nadawcę o nowy link."
              />
            )}
            {state === "already-viewed" && (
              <ErrorState
                icon={<Flame className="w-6 h-6 text-destructive" />}
                title="Sekret już odczytany"
                description="Ten link był jednorazowy i został już wykorzystany przez kogoś (być może przez Ciebie wcześniej)."
              />
            )}
            {state === "missing-key" && (
              <ErrorState
                icon={<Lock className="w-6 h-6 text-destructive" />}
                title="Niekompletny link"
                description="W tym adresie brakuje części odpowiedzialnej za odszyfrowanie. Upewnij się, że skopiowałeś cały link."
              />
            )}
            {state === "wrong-password" && (
              <motion.div key="wrongpass" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <ErrorState
                  icon={<Lock className="w-6 h-6 text-destructive" />}
                  title="Nieprawidłowe hasło"
                  description="Spróbuj wpisać hasło jeszcze raz."
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

// Mały pomocniczy komponent, żeby nie powtarzać tej samej struktury
// JSX dla czterech różnych stanów błędu.
function ErrorState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center space-y-4 py-4"
    >
      <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-medium mb-1">{title}</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {description}
        </p>
      </div>
    </motion.div>
  );
}