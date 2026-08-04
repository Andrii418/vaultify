"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Check, Loader2, ShieldOff, Puzzle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { decryptTextWithKey, combineSharesToKey } from "@/lib/crypto";

interface SplitSecretMeta {
  ciphertext: string;
  iv: string;
  shareThreshold: number;
  shareTotal: number;
}

export function ShareCombiner({
  id,
  ownShare,
}: {
  id: string;
  ownShare: string;
}) {
  const [meta, setMeta] = useState<SplitSecretMeta | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "not-found">(
    "loading"
  );
  const [collectedShares, setCollectedShares] = useState<string[]>([ownShare]);
  const [inputValue, setInputValue] = useState("");
  const [decryptedText, setDecryptedText] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/view-split-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
      .then(async (res) => {
        if (!res.ok) {
          setStatus("not-found");
          return;
        }
        const data: SplitSecretMeta = await res.json();
        setMeta(data);
        setStatus("ready");
      })
      .catch(() => setStatus("not-found"));
  }, [id]);

  function addShare() {
    // Recipient może wkleić cały link albo sam kod udziału.
    const hashIndex = inputValue.indexOf("#s=");
    const shareCode = hashIndex >= 0 ? inputValue.slice(hashIndex + 3) : inputValue.trim();

    if (!shareCode) {
      toast.error("Wklej udział albo pełny link.");
      return;
    }
    if (collectedShares.includes(shareCode)) {
      toast.error("Ten udział został już dodany.");
      return;
    }

    setCollectedShares((prev) => [...prev, shareCode]);
    setInputValue("");
  }

  async function attemptDecrypt() {
    if (!meta) return;
    setIsDecrypting(true);
    try {
      const key = await combineSharesToKey(collectedShares);
      const text = await decryptTextWithKey(
        { ciphertext: meta.ciphertext, iv: meta.iv },
        key
      );
      setDecryptedText(text);
      toast.success("Sekret odtworzony!");
    } catch {
      toast.error(
        "Nie udało się odszyfrować — sprawdź, czy udziały pochodzą z tego samego sekretu."
      );
    } finally {
      setIsDecrypting(false);
    }
  }

  async function handleCopy() {
    if (!decryptedText) return;
    await navigator.clipboard.writeText(decryptedText);
    setCopied(true);
    toast.success("Skopiowano.");
    setTimeout(() => setCopied(false), 2000);
  }

  if (status === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-8">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-muted-foreground">Sprawdzanie linku...</p>
      </div>
    );
  }

  if (status === "not-found" || !meta) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
          <ShieldOff className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-medium">Sekret nie istnieje</h2>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          Ten link jest nieprawidłowy albo sekret wygasł.
        </p>
      </div>
    );
  }

  const hasEnough = collectedShares.length >= meta.shareThreshold;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs font-mono-vaultify uppercase tracking-wider text-accent">
        <Users className="w-3.5 h-3.5" />
        Sekret podzielony na udziały
      </div>

      <AnimatePresence mode="wait">
        {decryptedText ? (
          <motion.div
            key="decrypted"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-4"
          >
            <motion.div
              initial={{ filter: "blur(8px)", opacity: 0 }}
              animate={{ filter: "blur(0px)", opacity: 1 }}
              transition={{ duration: 0.6 }}
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
              {copied ? (
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-accent" /> Skopiowano
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Copy className="w-4 h-4" /> Kopiuj do schowka
                </span>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="combining" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Ten sekret wymaga <strong>{meta.shareThreshold}</strong> z{" "}
              <strong>{meta.shareTotal}</strong> udziałów. Masz obecnie{" "}
              <strong>{collectedShares.length}</strong>.
            </p>

            <div className="space-y-2">
              {collectedShares.map((s, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-mono-vaultify text-muted-foreground"
                >
                  <Puzzle className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="truncate">
                    {i === 0 ? "Twój udział" : `Dodatkowy udział ${i}`}
                  </span>
                </div>
              ))}
            </div>

            {!hasEnough && (
              <div className="flex gap-2">
                <Input
                  placeholder="Wklej link lub kod kolejnego udziału"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addShare()}
                  className="bg-black/30 border-white/10 text-xs"
                />
                <Button onClick={addShare} variant="secondary" className="shrink-0">
                  Dodaj
                </Button>
              </div>
            )}

            <Button
              onClick={attemptDecrypt}
              disabled={!hasEnough || isDecrypting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
            >
              {isDecrypting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Odtwarzanie...
                </>
              ) : (
                "Odtwórz sekret"
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}