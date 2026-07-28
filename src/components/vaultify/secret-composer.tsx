"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  Lock,
  ShieldCheck,
  Copy,
  Check,
  Loader2,
  Eye,
  Paperclip,
  X,
  QrCode,
  Mail,
} from "lucide-react";
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
import {
  createEncryptionKey,
  encryptTextWithKey,
  encryptFileWithKey,
} from "@/lib/crypto";

const CIPHER_CHARS = "ABCDEF0123456789-_abcdef";

function scrambleText(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CIPHER_CHARS[Math.floor(Math.random() * CIPHER_CHARS.length)];
  }
  return out;
}

const TTL_OPTIONS = [
  { label: "5 minut", value: 5 * 60 * 1000 },
  { label: "1 godzina", value: 60 * 60 * 1000 },
  { label: "24 godziny", value: 24 * 60 * 60 * 1000 },
  { label: "7 dni", value: 7 * 24 * 60 * 60 * 1000 },
];

const VIEW_LIMIT_OPTIONS = [
  { label: "1 raz (spal po odczycie)", value: "1" },
  { label: "3 razy", value: "3" },
  { label: "5 razy", value: "5" },
  { label: "10 razy", value: "10" },
  { label: "Bez limitu (do wygaśnięcia)", value: "unlimited" },
];

const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

export function SecretComposer() {
  const [secretText, setSecretText] = useState("");
  const [scrambled, setScrambled] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [viewLimit, setViewLimit] = useState("1");
  const [notifyEmail, setNotifyEmail] = useState("");
  const [ttl, setTtl] = useState(String(TTL_OPTIONS[1].value));
  const [isCreating, setIsCreating] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showQr, setShowQr] = useState(false);

  const scrambleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      toast.error("Plik jest za duży. Maksymalny rozmiar to 4MB.");
      e.target.value = "";
      return;
    }
    setSelectedFile(file);
    setViewLimit("1");
  }

  async function handleCreateSecret() {
    if (!secretText.trim() && !selectedFile) {
      toast.error("Wpisz treść lub dołącz plik, który chcesz udostępnić.");
      return;
    }
    if (isPasswordProtected && password.length < 4) {
      toast.error("Hasło musi mieć przynajmniej 4 znaki.");
      return;
    }

    setIsCreating(true);

    try {
      const {
        key,
        keyForUrl,
        salt,
        isPasswordProtected: isProtected,
      } = await createEncryptionKey(isPasswordProtected ? password : undefined);

      const maxViews = viewLimit === "unlimited" ? null : Number(viewLimit);

      const meta: Record<string, unknown> = {
        salt,
        is_password_protected: isProtected,
        max_views: maxViews,
        expires_at: new Date(Date.now() + Number(ttl)).toISOString(),
        notify_email: notifyEmail.trim() || null,
      };

      if (secretText.trim()) {
        const textPayload = await encryptTextWithKey(secretText, key);
        meta.ciphertext = textPayload.ciphertext;
        meta.iv = textPayload.iv;
      }

      const formData = new FormData();

      if (selectedFile) {
        const filePayload = await encryptFileWithKey(selectedFile, key);
        meta.file_iv = filePayload.iv;
        meta.file_name = selectedFile.name;
        meta.file_mime = selectedFile.type || "application/octet-stream";
        meta.file_size_original = selectedFile.size;

        const normalizedBase64 = filePayload.ciphertext
          .replace(/-/g, "+")
          .replace(/_/g, "/");
        const binaryString = atob(normalizedBase64);
        const encryptedBytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          encryptedBytes[i] = binaryString.charCodeAt(i);
        }
        formData.append("file", new Blob([encryptedBytes]), "encrypted.bin");
      }

      formData.append("meta", JSON.stringify(meta));

      const response = await fetch("/api/create-secret", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.error || "Nie udało się stworzyć linku.");
        setIsCreating(false);
        return;
      }

      const newId = result.id;
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
    setSelectedFile(null);
    setViewLimit("1");
    setNotifyEmail("");
    setGeneratedLink(null);
    setShowQr(false);
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* ============ HERO ============ */}
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

              {/* Załącznik pliku */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {!selectedFile ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center gap-2 justify-center rounded-xl border border-dashed border-white/15 hover:border-primary/40 bg-white/[0.02] px-4 py-3 text-sm text-muted-foreground transition-colors"
                  >
                    <Paperclip className="w-4 h-4" />
                    Dołącz plik (max 4MB)
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm truncate">
                        {selectedFile.name}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        ({Math.round(selectedFile.size / 1024)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
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

              {/* Limit liczby odczytów */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  Ile razy sekret może zostać odczytany?
                </Label>
                <Select
                  value={viewLimit}
                  onValueChange={(value) => {
                    if (value !== null) setViewLimit(value);
                  }}
                  disabled={!!selectedFile}
                >
                  <SelectTrigger className="bg-black/30 border-white/10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIEW_LIMIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedFile && (
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Sekrety z załącznikiem zawsze mają limit 1 odczytu.
                  </p>
                )}
              </div>

              {/* Powiadomienie e-mail o odczycie */}
              <div>
                <Label className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Powiadom mnie e-mailem, gdy ktoś odczyta (opcjonalnie)
                </Label>
                <Input
                  type="email"
                  placeholder="twoj@email.com"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  className="bg-black/30 border-white/10"
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
                    if (value !== null) setTtl(value);
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

              <button
                type="button"
                onClick={() => setShowQr((prev) => !prev)}
                className="w-full flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <QrCode className="w-4 h-4" />
                {showQr ? "Ukryj kod QR" : "Pokaż kod QR"}
              </button>

              <AnimatePresence>
                {showQr && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="flex justify-center p-5 bg-white rounded-xl">
                      <QRCodeSVG
                        value={generatedLink}
                        size={180}
                        level="M"
                        marginSize={0}
                      />
                    </div>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Zeskanuj telefonem, żeby otworzyć link
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

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