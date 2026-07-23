/**
 * password.ts
 * 
 * Wyprowadzanie klucza kryptograficznego z hasła podanego przez
 * użytkownika, przy pomocy algorytmu PBKDF2 (Password-Based Key
 * Derivation Function 2).
 */

import { arrayBufferToBase64Url, base64UrlToArrayBuffer } from "./encoding";

// Długość "soli" (salt) w bajtach. Sól to losowe dane dodawane do
// hasła przed wyprowadzeniem klucza — zapobiega atakom typu
// "rainbow table" (gotowe tabele haseł i ich skrótów).
const SALT_LENGTH_BYTES = 16;

// Liczba iteracji PBKDF2. OWASP (organizacja zajmująca się
// bezpieczeństwem web) rekomenduje minimum 600 000 iteracji dla
// PBKDF2-SHA256 w 2024+. Im więcej iteracji, tym wolniej dla
// atakującego próbującego złamać hasło brute-force, ale też odrobinę
// wolniej dla legalnego użytkownika (choć nadal to milisekundy).
const PBKDF2_ITERATIONS = 600_000;

/**
 * Generuje losową sól — losowe bajty, które będą (jawnie, bezpiecznie)
 * zapisane w bazie danych obok zaszyfrowanego sekretu. Sól NIE jest
 * tajna — jej zadaniem jest tylko sprawić, że ten sam atakujący nie
 * może przygotować sobie z góry tabeli "hasło -> klucz" dla wielu
 * ofiar naraz.
 */
export function generateSalt(): Uint8Array {
  return window.crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
}

export function saltToBase64Url(salt: Uint8Array): string {
  return arrayBufferToBase64Url(salt.buffer as ArrayBuffer);
}

export function base64UrlToSalt(base64UrlSalt: string): Uint8Array {
  return new Uint8Array(base64UrlToArrayBuffer(base64UrlSalt));
}

/**
 * Wyprowadza klucz szyfrujący AES-256-GCM z hasła użytkownika i soli.
 * 
 * Ta sama para (hasło + sól) ZAWSZE wyprowadzi ten sam klucz —
 * to kluczowa właściwość: odbiorca, znając hasło i sól (sól bierzemy
 * z bazy danych, jest jawna), odtworzy dokładnie ten sam klucz,
 * którego użył nadawca do zaszyfrowania.
 */
export async function deriveKeyFromPassword(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  // Krok 1: importujemy surowe hasło jako "materiał klucza" (key material)
  // — to jeszcze nie jest gotowy klucz AES, tylko surowiec do jego
  // wyprowadzenia.
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    passwordBuffer,
    { name: "PBKDF2" },
    false, // hasło samo w sobie nie musi być "exportable"
    ["deriveKey"]
  );

  // Krok 2: uruchamiamy właściwy algorytm PBKDF2, który "rozciąga"
  // hasło przez PBKDF2_ITERATIONS rund funkcji skrótu SHA-256,
  // produkując na końcu solidny 256-bitowy klucz AES-GCM.
  const derivedKey = await window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );

  return derivedKey;
}