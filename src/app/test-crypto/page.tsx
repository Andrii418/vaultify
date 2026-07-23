"use client";

import { useState } from "react";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import { createClient } from "@/lib/supabase/client";
import type { BurnedSecretResult } from "@/lib/supabase/types";

export default function TestCryptoPage() {
  const [result, setResult] = useState<string>("");

  async function runFullTest() {
    const logs: string[] = [];
    const supabase = createClient();

    try {
      // KROK 1: Szyfrujemy sekret lokalnie w przeglądarce
      const originalText = "Test end-to-end Vaultify!";
      const { payload, keyForUrl } = await encryptSecret(originalText);
      logs.push("✅ Krok 1: Zaszyfrowano lokalnie");

      // KROK 2: Generujemy id SAMI w przeglądarce (zamiast prosić
      // bazę o wygenerowanie i zwrócenie go) — dzięki temu nie
      // potrzebujemy uprawnienia SELECT, którego celowo nie mamy.
      const newId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // +1 godzina

      const { error: insertError } = await supabase.from("secrets").insert({
        id: newId,
        ciphertext: payload.ciphertext,
        iv: payload.iv,
        salt: payload.salt,
        is_password_protected: payload.isPasswordProtected,
        burn_after_reading: true,
        expires_at: expiresAt.toISOString(),
      });

      if (insertError) {
        throw new Error(
          `INSERT failed — message: "${insertError.message}", code: "${insertError.code}"`
        );
      }
      logs.push(`✅ Krok 2: Zapisano w bazie, id = ${newId}`);

      // KROK 3: Symulujemy odbiorcę — wywołujemy funkcję RPC,
      // żeby atomowo odczytać i "spalić" sekret
      const { data: burned, error: rpcError } = await supabase
        .rpc("get_and_burn_secret", { secret_id: newId })
        .single<BurnedSecretResult>();

      if (rpcError) {
        throw new Error(
          `RPC failed — message: "${rpcError.message}", code: "${rpcError.code}"`
        );
      }
      logs.push("✅ Krok 3: Odczytano i spalono przez RPC");

      // KROK 4: Deszyfrujemy odczytaną treść, używając klucza z URL
      const decrypted = await decryptSecret(
        {
          ciphertext: burned.ciphertext,
          iv: burned.iv,
          salt: burned.salt,
          isPasswordProtected: burned.is_password_protected,
        },
        keyForUrl ?? undefined
      );

      logs.push(
        `${decrypted === originalText ? "✅" : "❌"} Krok 4: Odszyfrowano: "${decrypted}"`
      );

      // KROK 5: Próbujemy odczytać TEN SAM sekret drugi raz —
      // MUSI się nie udać, bo powinien być już usunięty ("spalony")
      const { error: secondReadError } = await supabase
        .rpc("get_and_burn_secret", { secret_id: newId })
        .single();

      if (secondReadError) {
        logs.push(
          `✅ Krok 5: Drugi odczyt poprawnie odrzucony (${secondReadError.message})`
        );
      } else {
        logs.push("❌ Krok 5: BŁĄD — drugi odczyt się udał, a nie powinien!");
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : JSON.stringify(error);
      logs.push(`❌ Błąd: ${errorMessage}`);
    }

    setResult(logs.join("\n"));
  }

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Test end-to-end: Kryptografia + Supabase</h1>
      <button onClick={runFullTest} style={{ padding: "10px 20px", marginBottom: "20px" }}>
        Uruchom pełny test
      </button>
      <pre style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
    </div>
  );
}