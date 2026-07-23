"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Copy, Check, Loader2, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { encryptSecret } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/client";

// Znaki używane w efekcie "scramble" pod polem tekstowym —
// mieszanka cyfr szesnastkowych i znaków Base64URL, żeby wyglądało
// jak prawdziwy szyfrogram, a nie przypadkowy tekst.
const CIPHER_CHARS = "ABCDEF0123456789-_abcdef";

function scrambleText(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
  }
  return out;
}

// Opcje czasu życia sekretu — wartość w milisekundach.
const TTL_OPTIONS = [
  { label: "5 minut", value: 5 * 60 * 1000 },
  { label: "1 godzina", value: 60 * 60 * 1000 },
  { label: "24 godziny", value: 24 * 60 * 60 * 1000 },
  { label: "7 dni", value: 7 * 24 * 60 * 60 * 1000 },
];

export function SecretComposer() {
  const [secretText, setSecretText] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [burnAfterReading, setBurnAfterReading] = useState(true);
  const [ttl, setTtl] = useState(String(TTL_OPTIONS[1].value));
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // EFEKT SYGNATUROWY: dopóki użytkownik pisze, co 80ms losujemy
  // nowy "szyfrogram" tej samej długości co wpisany tekst. To
  // wizualnie demonstruje ideę Zero-Knowledge na żywo — nikt,
  // nawet Vaultify, nie zobaczy prawdziwej treści.
  useEffect(() => {
    if (secretText.length === 0) {
      setScrambled("");
      if (scrambleIntervalRef.current) clearInterval(scrambleIntervalRef.current);
      return;
    }

    scrambleIntervalRef.current = setInterval(() => {
      setScrambled(scrambleText(secretText.length));
    }, 80);

    return () => {
      if (scrambleIntervalRef.current) clearInterval(scrambleIntervalRef.current);
    };
  }, [secretText.length]);

  async function handleCreateSecret() {
    if (!secretText.trim()) {
      toast.error("Wpisz treść, którą chcesz bezpiecznie udostępnić.");
      return;
    }
    if (isPasswordProtected && password.length < 4) {
      toast.error("Hasło musi mieć przynajmniej 4 znaki.");
      return;
    }

    setIsCreating(true);

    try {
      // Krok 1: szyfrujemy TREŚĆ LOKALNIE, zanim cokolwiek trafi do sieci
      const { payload, keyForUrl } = await encryptSecret(
        secretText,
        isPasswordProtected ? password : undefined
      );

      // Krok 2: generujemy id sami (patrz wyjaśnienie z Etapu 3 —
      // pozwala to ominąć potrzebę uprawnienia SELECT po zapisie)
      const newId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + Number(ttl));

      const supabase = createClient();
      const { error } = await supabase.from("secrets").insert({
        id: newId,
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        salt: payload.salt,
        is_password_protected: payload.isPasswordProtected,
        burn_after_reading: burnAfterReading,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      // Krok 3: budujemy finalny link. Klucz trafia do fragmentu (#k=...)
      // TYLKO gdy sekret NIE jest chroniony hasłem — patrz Etap 2.
      const baseUrl = `${window.location.origin}/s/${newId}`;
      const finalLink = keyForUrl ? `${baseUrl}#k=${keyForUrl}` : baseUrl;

      setGeneratedLink(finalLink);
      toast.success("Bezpieczny link został stworzony.");
    } catch (err) {
      console.error(err);
      toast.error("Nie udało się stworzyć linku. Spróbuj ponownie.");
    } finally {
      setIsCreating(false);
    }
  }

  async function handleCopy() {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    toast.success("Link skopiowany do schowka.");
    setTimeout(() => setCopied(false), 2000);
  }

  function handleReset() {
    setSecretText("");
    setPassword("");
    setIsPasswordProtected(false);
    setGeneratedLink(null);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ============ HERO — nagłówek wartości ============ */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <div className="inline-flex items-center gap-2 font-mono-vaultify text-xs uppercase tracking-wider text-accent mb-4 px-3 py-1 rounded-full border border-white/10 bg-white/[0.02]">
          <ShieldCheck className="w-3.5 h-3.5" />
          Szyfrowanie Zero-Knowledge · AES-256-GCM
        </div>
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground mb-3">
          Udostępnij sekret,
          <br />
          <span className="text-primary">którego nikt nie podejrzy.</span>
        </h1>
        <p className="text-muted-foreground text-base max-w-md mx-auto">
          Treść szyfrujemy w Twojej przeglądarce, zanim cokolwiek trafi na
          nasz serwer. My też jej nie zobaczymy.
        </p>
      </motion.div>

      {/* ============ PANEL EDYTORA / WYNIKU ============ */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="glass-panel glow-border-hover rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/40"
      >
        <AnimatePresence mode="wait">
          {!generatedLink ? (
            // ---------- WIDOK 1: EDYTOR ----------
            <motion.div
              key="editor"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              <div>
                <Textarea
                  placeholder="Wklej hasło, klucz API lub poufną wiadomość..."
                  value={secretText}
                  onChange={(e) => setSecretText(e.target.value)}
                  className="min-h-[140px] bg-black/30 border-white/10 focus-visible:ring-primary/50 font-mono-vaultify text-sm resize-none"
                />
                {/* Element sygnaturowy: podgląd na żywo, jak treść
                    zamienia się w migoczący szyfrogram */}
                <AnimatePresence>
                  {scrambled && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 px-3 py-2 rounded-lg bg-accent/[0.06] border border-accent/20 overflow-hidden"
                    >
                      <p className="font-mono-vaultify text-[11px] text-accent/70 break-all leading-relaxed">
                        {scrambled}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Opcja: ochrona hasłem */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="password-toggle" className="text-sm font-medium">
                      Chroń dodatkowym hasłem
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Odbiorca będzie potrzebował linku i hasła
                    </p>
                  </div>
                </div>
                <Switch
                  id="password-toggle"
                  checked={isPasswordProtected}
                  onCheckedChange={setIsPasswordProtected}
                />
              </div>

              <AnimatePresence>
                {isPasswordProtected && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Input
                      type="password"
                      placeholder="Wpisz hasło (min. 4 znaki)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-black/30 border-white/10"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Opcja: spal po odczycie */}
              <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="flex items-center gap-3">
                  <Flame className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <Label htmlFor="burn-toggle" className="text-sm font-medium">
                      Usuń natychmiast po odczycie
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Sekret zniknie po pierwszym otwarciu linku
                    </p>
                  </div>
                </div>
                <Switch
                  id="burn-toggle"
                  checked={burnAfterReading}
                  onCheckedChange={setBurnAfterReading}
                />
              </div>

              {/* Wybór czasu życia */}
              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Link wygaśnie za
                </Label>
                <Select
  value={ttl}
  onValueChange={(value) => {
    // Base UI's Select może technicznie zwrócić null (np. gdy
    // wybór zostanie wyczyszczony) — w Vaultify zawsze musi być
    // wybrana jakaś opcja, więc w takim wypadku wracamy do domyślnej.
    if (value !== null) {
      setTtl(value);
    }
  }}
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
                onClick={handleCreateSecret}
                disabled={isCreating}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium h-11"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Szyfrowanie...
                  </>
                ) : (
                  "Stwórz bezpieczny link"
                )}
              </Button>
            </motion.div>
          ) : (
            // ---------- WIDOK 2: WYNIK (link gotowy) ----------
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-5 text-center"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-accent/10 border border-accent/30 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-accent" />
              </div>
              <div>
                <h3 className="text-lg font-medium mb-1">Link jest gotowy</h3>
                <p className="text-sm text-muted-foreground">
                  Wyślij go zaufanej osobie — wygaśnie automatycznie.
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/30 p-2">
                <code className="flex-1 text-xs font-mono-vaultify text-left px-2 py-1.5 truncate text-foreground/90">
                  {generatedLink}
                </code>
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={handleCopy}
                  className="shrink-0 bg-white/5 hover:bg-white/10"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.span
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="w-4 h-4 text-accent" />
                      </motion.span>
                    ) : (
                      <motion.span
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Button>
              </div>

              <Button
                onClick={handleReset}
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
              >
                Stwórz kolejny sekret
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}