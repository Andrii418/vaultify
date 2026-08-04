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
  Download,
  Paperclip,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  decryptTextWithKey,
  decryptFileWithKey,
  resolveDecryptionKey,
} from "@/lib/crypto";
import type { BurnedSecretResult } from "@/lib/supabase/types";
import { ShareCombiner } from "@/components/vaultify/share-combiner";

type ViewState =
  | "loading"
  | "needs-password"
  | "decrypting"
  | "revealed"
  | "not-found"
  | "expired"
  | "already-viewed"
  | "missing-key"
  | "wrong-password";

export default function SecretViewPage() {
  const params = useParams<{ id: string }>();
  const [state, setState] = useState<ViewState>("loading");
  const [decryptedText, setDecryptedText] = useState<string>("");
  const [decryptedFile, setDecryptedFile] = useState<{
    blob: Blob;
    name: string;
  } | null>(null);
  const [password, setPassword] = useState("");
  const [copied, setCopied] = useState(false);

  const [burnedPayload, setBurnedPayload] = useState<BurnedSecretResult | null>(
    null
  );
  const [keyFromUrl, setKeyFromUrl] = useState<string | undefined>(undefined);

  // Rozróżniamy dwa CAŁKOWICIE różne typy linków po fragmencie URL:
  // "#k=..." to zwykły, pojedynczy klucz (dotychczasowy przepływ),
  // "#s=..." to jeden UDZIAŁ w podzielonym sekrecie Shamira — wymaga
  // zupełnie innej logiki (zbieranie wielu udziałów zamiast od razu
  // deszyfrować). null = jeszcze nie sprawdziliśmy.
  const [isSplitLink, setIsSplitLink] = useState<boolean | null>(null);
  const [ownShare, setOwnShare] = useState<string>("");

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith("#s=")) {
      setOwnShare(hash.slice(3));
      setIsSplitLink(true);
    } else {
      setIsSplitLink(false);
    }
  }, []);

  // Wspólna logika deszyfrowania tekstu I/LUB pliku — wywoływana
  // zarówno przy pierwszej próbie (bez hasła), jak i po wpisaniu hasła.
  async function decryptEverything(
    data: BurnedSecretResult,
    urlKey?: string,
    pwd?: string
  ) {
    const key = await resolveDecryptionKey(urlKey, pwd, data.salt);

    if (data.ciphertext && data.iv) {
      const text = await decryptTextWithKey(
        { ciphertext: data.ciphertext, iv: data.iv },
        key
      );
      setDecryptedText(text);
    }

    if (data.file_path && data.file_iv && data.file_name) {
      const res = await fetch("/api/download-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: data.file_path }),
      });

      if (!res.ok) throw new Error("FILE_DOWNLOAD_FAILED");

      const encryptedBytes = await res.arrayBuffer();

      let binaryString = "";
      const bytes = new Uint8Array(encryptedBytes);
      for (let i = 0; i < bytes.byteLength; i++) {
        binaryString += String.fromCharCode(bytes[i]);
      }
      const base64Url = btoa(binaryString)
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      const fileBuffer = await decryptFileWithKey(
        { ciphertext: base64Url, iv: data.file_iv },
        key
      );

      const blob = new Blob([fileBuffer], {
        type: data.file_mime || "application/octet-stream",
      });
      setDecryptedFile({ blob, name: data.file_name });
    }
  }

  useEffect(() => {
    // Czekamy, aż wiemy CZY to link "split" — jeśli tak, cała ta
    // ścieżka (RPC get_and_burn_secret) w ogóle się nie uruchamia,
    // bo obsługę przejmuje komponent ShareCombiner.
    if (isSplitLink !== false) return;

    async function fetchAndAttemptDecrypt() {
      // Fragment URL (#k=...) jest dostępny WYŁĄCZNIE w przeglądarce,
      // nigdy na serwerze — dlatego ten kod musi być w useEffect.
      const hash = window.location.hash;
      const extractedKey = hash.startsWith("#k=") ? hash.slice(3) : undefined;
      setKeyFromUrl(extractedKey);

      // Odczyt sekretu idzie teraz przez nasz serwer (nie bezpośrednio
      // z przeglądarki do Supabase) — to pozwala serwerowi bezpiecznie
      // wysłać powiadomienie e-mail do nadawcy, korzystając z klucza
      // API Resend, który nigdy nie może trafić do przeglądarki.
      const res = await fetch("/api/view-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: params.id }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "SECRET_EXPIRED") {
          setState("expired");
        } else if (body.error === "SECRET_ALREADY_VIEWED") {
          setState("already-viewed");
        } else {
          setState("not-found");
        }
        return;
      }

      const data: BurnedSecretResult = await res.json();
      setBurnedPayload(data);

      if (data.is_password_protected) {
        setState("needs-password");
        return;
      }

      if (!extractedKey) {
        setState("missing-key");
        return;
      }

      try {
        await decryptEverything(data, extractedKey, undefined);
        setState("revealed");
      } catch {
        setState("wrong-password");
      }
    }

    fetchAndAttemptDecrypt();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, isSplitLink]);

  async function handlePasswordSubmit() {
    if (!burnedPayload || !password) return;

    setState("decrypting");
    try {
      await decryptEverything(burnedPayload, keyFromUrl, password);
      setState("revealed");
    } catch {
      // Złe hasło — sekret w bazie mógł być już "spalony" przy
      // pierwszym odczycie, ale zaszyfrowaną treść wciąż mamy
      // lokalnie w `burnedPayload`, więc kolejne próby hasła NIE
      // wymagają nowego zapytania do serwera.
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

  function handleDownloadFile() {
    if (!decryptedFile) return;
    const url = URL.createObjectURL(decryptedFile.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = decryptedFile.name;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg">
        <div className="glass-panel rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
          {isSplitLink === true ? (
            <ShareCombiner id={params.id} ownShare={ownShare} />
          ) : isSplitLink === null ? (
            <div className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
          ) : (
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
                    {burnedPayload?.is_final_view ? (
                      <>
                        <Flame className="w-3.5 h-3.5" />
                        Ten sekret został właśnie zniszczony na serwerze
                      </>
                    ) : burnedPayload?.remaining_views !== null &&
                      burnedPayload?.remaining_views !== undefined ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Pozostało jeszcze {burnedPayload.remaining_views}{" "}
                        {burnedPayload.remaining_views === 1
                          ? "odczyt"
                          : "odczyty(ów)"}
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        Ten link pozostanie aktywny aż wygaśnie
                      </>
                    )}
                  </div>

                  {decryptedText && (
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
                  )}

                  {decryptedFile && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                      className="rounded-xl border border-white/10 bg-black/30 p-4 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-sm truncate">
                          {decryptedFile.name}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={handleDownloadFile}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Pobierz
                      </Button>
                    </motion.div>
                  )}

                  {decryptedText && (
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
                  )}

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
                <motion.div
                  key="wrongpass"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <ErrorState
                    icon={<Lock className="w-6 h-6 text-destructive" />}
                    title="Nieprawidłowe hasło"
                    description="Spróbuj wpisać hasło jeszcze raz."
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </div>
      </div>
    </main>
  );
}

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