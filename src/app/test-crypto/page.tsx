"use client";

import { useState } from "react";
import { encryptSecret, decryptSecret } from "@/lib/crypto";

/**
 * TYMCZASOWA strona testowa silnika kryptograficznego.
 * Usuniemy ten plik po zweryfikowaniu, że wszystko działa poprawnie —
 * nie jest częścią finalnej aplikacji Vaultify.
 */
export default function TestCryptoPage() {
  const [result, setResult] = useState<string>("");

  async function runTests() {
    const logs: string[] = [];

    try {
      // Test 1: szyfrowanie BEZ hasła
      const original1 = "To jest tajna wiadomość!";
      const encrypted1 = await encryptSecret(original1);
      const decrypted1 = await decryptSecret(
        encrypted1.payload,
        encrypted1.keyForUrl ?? undefined
      );
      logs.push(
        `✅ Test bez hasła: ${decrypted1 === original1 ? "SUKCES" : "BŁĄD"}`
      );
      logs.push(`   Oryginał: "${original1}"`);
      logs.push(`   Odszyfrowane: "${decrypted1}"`);
      logs.push(`   Zaszyfrowane (ciphertext): ${encrypted1.payload.ciphertext.slice(0, 40)}...`);
      logs.push(`   Klucz w URL: ${encrypted1.keyForUrl?.slice(0, 20)}...`);

      // Test 2: szyfrowanie Z hasłem
      const original2 = "Sekret chroniony hasłem!";
      const password = "MojeSuperHaslo123";
      const encrypted2 = await encryptSecret(original2, password);
      const decrypted2 = await decryptSecret(
        encrypted2.payload,
        undefined,
        password
      );
      logs.push(`✅ Test z hasłem: ${decrypted2 === original2 ? "SUKCES" : "BŁĄD"}`);

      // Test 3: złe hasło MUSI się nie udać
      try {
        await decryptSecret(encrypted2.payload, undefined, "ZleHaslo");
        logs.push("❌ Test złego hasła: BŁĄD — odszyfrowało się, a nie powinno!");
      } catch {
        logs.push("✅ Test złego hasła: SUKCES — poprawnie odrzucono złe hasło");
      }
    } catch (error) {
      logs.push(`❌ Wystąpił błąd: ${error}`);
    }

    setResult(logs.join("\n"));
  }

  return (
    <div style={{ padding: "40px", fontFamily: "monospace" }}>
      <h1>Test silnika kryptograficznego Vaultify</h1>
      <button onClick={runTests} style={{ padding: "10px 20px", marginBottom: "20px" }}>
        Uruchom testy
      </button>
      <pre style={{ whiteSpace: "pre-wrap" }}>{result}</pre>
    </div>
  );
}