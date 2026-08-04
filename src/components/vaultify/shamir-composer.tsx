"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Copy, Check, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  createEncryptionKey,
  encryptTextWithKey,
  splitKeyIntoShares,
} from "@/lib/crypto";

const TTL_OPTIONS = [
  { label: "1 godzina", value: 60 * 60 * 1000 },
  { label: "24 godziny", value: 24 * 60 * 60 * 1000 },
  { label: "7 dni", value: 7 * 24 * 60 * 60 * 1000 },
];

export function ShamirComposer() {
  const [secretText, setSecretText] = useState("");
  const [totalShares, setTotalShares] = useState("5");
  const [threshold, setThreshold] = useState("3");
  const [ttl, setTtl] = useState(String(TTL_OPTIONS[1].value));
  const [isCreating, setIsCreating] = useState(false);
  const [links, setLinks] = useState<string[] | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleCreate() {
    const n = Number(totalShares);
    const k = Number(threshold);

    if (!secretText.trim()) {
      toast.error("Wpisz treść, którą chcesz podzielić.");
      return;
    }
    if (k < 2 || k > n || n > 10) {
      toast.error("Sprawdź parametry: 2 ≤ próg ≤ liczba udziałów ≤ 10.");
      return;
    }

    setIsCreating(true);

    try {
      const { key } = await createEncryptionKey(); // zawsze losowy klucz
      const textPayload = await encryptTextWithKey(secretText, key);
      const shareStrings = await splitKeyIntoShares(key, n, k);

      const formData = new FormData();
      formData.append(
        "meta",
        JSON.stringify({
          ciphertext: textPayload.ciphertext,
          iv: textPayload.iv,
          salt: null,
          is_password_protected: false,
          expires_at: new Date(Date.now() + Number(ttl)).toISOString(),
          is_split: true,
          share_threshold: k,
          share_total: n,
        })
      );

      const response = await fetch("/api/create-secret", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Nie udało się stworzyć sekretu.");
        setIsCreating(false);
        return;
      }

      const baseUrl = `${window.location.origin}/s/${result.id}`;
      const generatedLinks = shareStrings.map((s) => `${baseUrl}#s=${s}`);
      setLinks(generatedLinks);
      toast.success(`Stworzono ${n} udziałów.`);
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się stworzyć sekretu. Spróbuj ponownie.");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyLink(link: string, index: number) {
    await navigator.clipboard.writeText(link);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleReset() {
    setSecretText("");
    setLinks(null);
  }

  return (
    <div className="w-full max-w-2xl mx-auto glass-panel glow-border-hover rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40">
      <AnimatePresence mode="wait">
        {!links ? (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-5"
          >
            <div className="flex items-center gap-2 text-xs font-mono-vaultify uppercase tracking-wider text-accent">
              <Users className="w-3.5 h-3.5" />
              Podział sekretu — Shamir's Secret Sharing
            </div>
            <p className="text-sm text-muted-foreground">
              Klucz szyfrujący zostanie podzielony na kilka udziałów.
              Mniej niż wymagany próg nie ujawnia o kluczu absolutnie nic —
              nawet matematycznie.
            </p>

            <Textarea
              placeholder="Wpisz treść, którą chcesz podzielić..."
              value={secretText}
              onChange={(e) => setSecretText(e.target.value)}
              className="min-h-[140px] bg-black/30 border-white/10 focus-visible:ring-primary/50 font-mono-vaultify text-sm resize-none"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Liczba udziałów (N)
                </Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={totalShares}
                  onChange={(e) => setTotalShares(e.target.value)}
                  className="bg-black/30 border-white/10"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Wymagany próg (K)
                </Label>
                <Input
                  type="number"
                  min={2}
                  max={10}
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className="bg-black/30 border-white/10"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Link wygaśnie za
              </Label>
              <Select
                value={ttl}
                onValueChange={(v) => v !== null && setTtl(v)}
              >
                <SelectTrigger className="bg-black/30 border-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TTL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={String(opt.value)}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              onClick={handleCreate}
              disabled={isCreating}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Dzielenie sekretu...
                </>
              ) : (
                "Podziel i wygeneruj udziały"
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-medium">
                Wygenerowano {links.length} udziałów
              </h3>
              <p className="text-sm text-muted-foreground">
                Rozdziel je między różne osoby/kanały. Dowolne{" "}
                <strong>{threshold}</strong> z nich razem odtworzą sekret.
              </p>
            </div>

            <div className="space-y-2">
              {links.map((link, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2"
                >
                  <span className="text-xs font-mono-vaultify text-muted-foreground px-2 shrink-0">
                    #{i + 1}
                  </span>
                  <code className="flex-1 text-xs font-mono-vaultify text-left px-2 py-1.5 truncate text-foreground/90">
                    {link}
                  </code>
                  <Button
                    size="icon"
                    variant="secondary"
                    onClick={() => copyLink(link, i)}
                    className="shrink-0 bg-white/5 hover:bg-white/10"
                  >
                    {copiedIndex === i ? (
                      <Check className="w-4 h-4 text-accent" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              ))}
            </div>

            <Button
              onClick={handleReset}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Podziel kolejny sekret
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}