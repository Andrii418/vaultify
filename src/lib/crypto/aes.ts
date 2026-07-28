/**
 * aes.ts
 * 
 * Rdzeń silnika kryptograficznego Vaultify.
 * Cała logika opiera się na natywnym, wbudowanym w przeglądarkę
 * Web Crypto API (window.crypto.subtle) — NIE używamy żadnej
 * zewnętrznej biblioteki kryptograficznej z npm.
 */

import {
  arrayBufferToBase64Url,
  base64UrlToArrayBuffer,
  arrayBufferToString,
  stringToArrayBuffer,
} from "./encoding";

const IV_LENGTH_BYTES = 12;

export interface EncryptedPayload {
  ciphertext: string;
  iv: string;
}

export async function generateEncryptionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function exportKeyToBase64Url(key: CryptoKey): Promise<string> {
  const rawKey = await window.crypto.subtle.exportKey("raw", key);
  return arrayBufferToBase64Url(rawKey);
}

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

export async function encryptData(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
  const plaintextBuffer = stringToArrayBuffer(plaintext);

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    plaintextBuffer
  );

  return {
    ciphertext: arrayBufferToBase64Url(ciphertextBuffer),
    iv: arrayBufferToBase64Url(iv.buffer as ArrayBuffer),
  };
}

export async function decryptData(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  const ciphertextBuffer = base64UrlToArrayBuffer(payload.ciphertext);
  const ivBuffer = base64UrlToArrayBuffer(payload.iv);

  try {
    const plaintextBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
      key,
      ciphertextBuffer
    );

    return arrayBufferToString(plaintextBuffer);
  } catch (error) {
    throw new Error(
      "Nie udało się odszyfrować danych. Klucz jest nieprawidłowy lub dane zostały uszkodzone."
    );
  }
}

/**
 * Wariant encryptData dla surowych danych binarnych (pliki) zamiast
 * tekstu. Różnica: nie konwertujemy przez stringToArrayBuffer/UTF-8,
 * bo to zniszczyłoby zawartość plików niebędących tekstem.
 */
export async function encryptBuffer(
  data: ArrayBuffer,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const iv = window.crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));

  const ciphertextBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  );

  return {
    ciphertext: arrayBufferToBase64Url(ciphertextBuffer),
    iv: arrayBufferToBase64Url(iv.buffer as ArrayBuffer),
  };
}

/**
 * Wariant decryptData zwracający surowe bajty (ArrayBuffer) zamiast
 * tekstu — używany do odzyskiwania oryginalnego pliku.
 */
export async function decryptBuffer(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const ciphertextBuffer = base64UrlToArrayBuffer(payload.ciphertext);
  const ivBuffer = base64UrlToArrayBuffer(payload.iv);

  try {
    return await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
      key,
      ciphertextBuffer
    );
  } catch {
    throw new Error(
      "Nie udało się odszyfrować pliku. Klucz jest nieprawidłowy lub dane zostały uszkodzone."
    );
  }
}