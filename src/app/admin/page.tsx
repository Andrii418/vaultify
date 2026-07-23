"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, ShieldCheck, Eye, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Stats {
  total_created: number;
  total_viewed: number;
  currently_stored: number;
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Błąd logowania.");
        return;
      }
      setStats(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="glass-panel rounded-2xl p-8 shadow-2xl shadow-black/40">
          <AnimatePresence mode="wait">
            {!stats ? (
              <motion.div
                key="login"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-5 text-center"
              >
                <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h1 className="text-lg font-medium">Panel administracyjny</h1>
                <Input
                  type="password"
                  placeholder="Hasło administratora"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                  className="bg-black/30 border-white/10 text-center"
                  autoFocus
                />
                <Button
                  onClick={handleLogin}
                  disabled={!password || loading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Zaloguj"
                  )}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="stats"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <h1 className="text-lg font-medium text-center mb-6">
                  Statystyki Vaultify
                </h1>
                <StatRow
                  icon={<ShieldCheck className="w-4 h-4 text-accent" />}
                  label="Sekretów stworzonych łącznie"
                  value={stats.total_created}
                />
                <StatRow
                  icon={<Eye className="w-4 h-4 text-primary" />}
                  label="Sekretów odczytanych łącznie"
                  value={stats.total_viewed}
                />
                <StatRow
                  icon={<Database className="w-4 h-4 text-muted-foreground" />}
                  label="Obecnie w bazie (nieodczytane)"
                  value={stats.currently_stored}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

function StatRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <div className="flex items-center gap-3">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <span className="text-lg font-mono-vaultify font-medium">{value}</span>
    </div>
  );
}