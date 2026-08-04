"use client";

import { useState } from "react";
import { SecretComposer } from "@/components/vaultify/secret-composer";
import { ShamirComposer } from "@/components/vaultify/shamir-composer";

export function ComposerTabs() {
  const [mode, setMode] = useState<"single" | "split">("single");

  return (
    <div>
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.02] p-1">
          <button
            onClick={() => setMode("single")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              mode === "single"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Pojedynczy link
          </button>
          <button
            onClick={() => setMode("split")}
            className={`px-4 py-2 rounded-lg text-sm transition-colors ${
              mode === "split"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Podziel sekret (Shamir)
          </button>
        </div>
      </div>

      {mode === "single" ? <SecretComposer /> : <ShamirComposer />}
    </div>
  );
}