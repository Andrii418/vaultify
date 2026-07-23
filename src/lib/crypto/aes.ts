/**
 * aes.ts
 * 
 * Rdzeń silnika kryptograficznego Vaultify.
 * Cała logika opiera się na natywnym, wbudowanym w przeglądarkę
 * Web Crypto API (window.crypto.subtle) — NIE używamy żadnej
 * zewnętrznej biblioteki kryptograficznej z npm. To ważne z dwóch
 * powodów:
 * 1. Bezpieczeństwo — Web Crypto API jest zaimplementowane przez
 *    producentów przeglądarek i poddawane niezależnym audytom,
 *    zamiast ufać kodowi JS z npm.
 * 2. Wydajność — operacje wykonują się na poziomie natywnym (C++),
 *    a nie w interpretowanym JavaScripcie.
 */

import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  arrayBufferToString,
  stringToArrayBuffer,
} from "./encoding";

// Długość wektora inicjalizującego (IV) dla AES-GCM.
// 12 bajtów (96 bitów) to oficjalnie rekomendowana przez NIST długość
// dla GCM — daje najlepszy balans bezpieczeństwa i wydajności.
const IV_LENGTH_BYTES = 12;

/**
 * Struktura reprezentująca kompletny zaszyfrowany pakiet danych,
 * gotowy do zapisania w bazie danych.
 */
export interface EncryptedPayload {
  ciphertext: string; // Zaszyfrowana treść, zakodowana w Base64URL
  iv: string; // Wektor inicjalizujący użyty przy tym szyfrowaniu, w Base64URL
}

/**
 * Generuje nowy, losowy klucz szyfrujący AES-256-GCM.
 * 
 * Ten klucz to "serce" bezpieczeństwa Zero-Knowledge — jest generowany
 * w 100% lokalnie w przeglądarce nadawcy i NIGDY nie opuszcza jej
 * w formie jawnej (poza umieszczeniem w fragmencie URL, którego
 * serwer nie widzi).
 */
export async function generateEncryptionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256, // 256-bit = obecny złoty standard, praktycznie niemożliwy do złamania brute-force
    },
    true, // extractable: true — MUSI być true, żebyśmy mogli wyeksportować
    // klucz do formatu tekstowego i umieścić go w URL. Gdyby było false,
    // klucz istniałby tylko "wewnątrz" przeglądarki i nie dałoby się go
    // przekazać do URL.
    ["encrypt", "decrypt"] // Do czego klucz może być użyty
  );
}

/**
 * Eksportuje obiekt CryptoKey do formatu Base64URL — czyli tekstu,
 * który możemy wkleić do adresu URL jako fragment (#k=...).
 */
export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const rawKey = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64Url(rawKey);
}

/**
 * Odwrotność powyższej funkcji — odbiorca linku wyciąga klucz
 * z fragmentu URL (tekst) i "importuje" go z powrotem jako
 * obiekt CryptoKey, którego może użyć do deszyfrowania.
 */
export async function importKeyFromBase64Url(
  base64UrlKey: string
): Promise<CryptoKey> {
  const rawKey = base64UrlToArrayBuffer(base64UrlKey);

  return window.crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

/**
 * Szyfruje tekstową treść sekretu przy pomocy podanego klucza.
 * 
 * Zwraca ciphertext ORAZ iv (wektor inicjalizujący) — oba te elementy
 * są wymagane do późniejszego odszyfrowania i oba są bezpieczne do
 * zapisania jawnie w bazie danych (IV nie jest tajny, tylko klucz jest tajny).
 */
export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedPayload> {
  // Generujemy LOSOWY wektor inicjalizujący dla TEJ KONKRETNEJ operacji
  // szyfrowania. To krytyczne: ten sam IV nigdy nie może być użyty
  // dwukrotnie z tym samym kluczem — złamałoby to bezpieczeństwo GCM.
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

  const plaintextBuffer = stringToArrayBuffer(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64Url(ciphertextBuffer),
    iv: arrayBufferToBase64Url(iv.buffer as ArrayBuffer),
  };
}

/**
 * Odszyfrowuje dane zaszyfrowane funkcją encryptData powyżej.
 * 
 * Jeśli podany klucz jest niepoprawny (np. ktoś próbuje odgadnąć link),
 * albo dane zostały uszkodzone/zmodyfikowane — ta funkcja rzuci błąd.
 * To jest zamierzone zachowanie dzięki wbudowanemu w GCM tagowi
 * uwierzytelniającemu.
 */
export async function decryptData(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64UrlToArrayBuffer(payload.ciphertext);
  const ivBuffer = base64UrlToArrayBuffer(payload.iv);

  try {
    const plaintextBuffer = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: new Uint8Array(ivBuffer),
      },
      key,
      ciphertextBuffer
    );

    return arrayBufferToString(plaintextBuffer);
  } catch (error) {
    // Web Crypto API rzuca generyczny błąd "OperationError" przy złym
    // kluczu — celowo nie zdradza WIĘCEJ szczegółów (to funkcja
    // bezpieczeństwa, nie bug), więc łapiemy to i rzucamy własny,
    // czytelny komunikat.
    throw new Error(
      "Nie udało się odszyfrować danych. Klucz jest nieprawidłowy lub dane zostały uszkodzone."
    );
  }
}