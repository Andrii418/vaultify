/**
 * index.ts
 * 
 * Publiczne, wysokopoziomowe API silnika kryptograficznego Vaultify.
 * Komponenty React w aplikacji importują TYLKO z tego pliku.
 */

import {
  generateEncryptionKey,
  exportKeyToBase64Url,
  importKeyFromBase64Url,
  encryptData,
  decryptData,
  encryptBuffer,
  decryptBuffer,
  type EncryptedPayload,
} from "./aes";

import {
  generateSalt,
  saltToBase64Url,
  base64UrlToSalt,
  deriveKeyFromPassword,
} from "./password";

/**
 * Kompletny wynik zaszyfrowania sekretu tekstowego (stara ścieżka,
 * zostawiona dla kompatybilności — nowy kod woli createEncryptionKey).
 */
export interface VaultifyEncryptedSecret {
  ciphertext: string;
  iv: string;
  salt: string | null;
  isPasswordProtected: boolean;
}

export interface EncryptResult {
  payload: VaultifyEncryptedSecret;
  keyForUrl: string | null;
}

/**
 * Starsza, wysokopoziomowa funkcja szyfrująca WYŁĄCZNIE tekst.
 * Zostawiona dla kompatybilności z resztą kodu — nowy SecretComposer
 * używa zamiast tego createEncryptionKey + encryptTextWithKey,
 * żeby móc użyć TEGO SAMEGO klucza również do pliku.
 */
export async function encryptSecret(
  plaintext: string,
  password?: string
): Promise<EncryptResult> {
  if (!password) {
    const key = await generateEncryptionKey();
    const encrypted = await encryptData(plaintext, key);
    const keyForUrl = await exportKeyToBase64Url(key);

    return {
      payload: {
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: null,
        isPasswordProtected: false,
      },
      keyForUrl,
    };
  }

  const salt = generateSalt();
  const key = await deriveKeyFromPassword(password, salt);
  const encrypted = await encryptData(plaintext, key);

  return {
    payload: {
      ciphertext: encrypted.ciphertext,
      iv: encrypted.iv,
      salt: saltToBase64Url(salt),
      isPasswordProtected: true,
    },
    keyForUrl: null,
  };
}

export async function decryptSecret(
  payload: VaultifyEncryptedSecret,
  keyFromUrl?: string,
  password?: string
): Promise<string> {
  let key: CryptoKey;

  if (payload.isPasswordProtected) {
    if (!password || !payload.salt) {
      throw new Error("To hasło jest wymagane, aby odszyfrować ten sekret.");
    }
    const salt = base64UrlToSalt(payload.salt);
    key = await deriveKeyFromPassword(password, salt);
  } else {
    if (!keyFromUrl) {
      throw new Error(
        "Brak klucza deszyfrującego w adresie URL. Link jest niekompletny."
      );
    }
    key = await importKeyFromBase64Url(keyFromUrl);
  }

  return decryptData({ ciphertext: payload.ciphertext, iv: payload.iv }, key);
}

// ============================================================
// NOWE API — pozwala szyfrować JEDNYM wspólnym kluczem zarówno
// tekst, jak i plik (potrzebne do Etapu 7: udostępniania plików).
// ============================================================

/**
 * Tworzy klucz szyfrujący sesji — albo losowy (trafi do URL),
 * albo wyprowadzony z hasła.
 */
export async function createEncryptionKey(password?: string): Promise<{
  key: CryptoKey;
  keyForUrl: string | null;
  salt: string | null;
  isPasswordProtected: boolean;
}> {
  if (!password) {
    const key = await generateEncryptionKey();
    const keyForUrl = await exportKeyToBase64Url(key);
    return { key, keyForUrl, salt: null, isPasswordProtected: false };
  }

  const saltBytes = generateSalt();
  const key = await deriveKeyFromPassword(password, saltBytes);
  return {
    key,
    keyForUrl: null,
    salt: saltToBase64Url(saltBytes),
    isPasswordProtected: true,
  };
}

export async function encryptTextWithKey(
  plaintext: string,
  key: CryptoKey
): Promise<EncryptedPayload> {
  return encryptData(plaintext, key);
}

export async function decryptTextWithKey(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<string> {
  return decryptData(payload, key);
}

/** Szyfruje plik (File z <input type="file">) podanym kluczem. */
export async function encryptFileWithKey(
  file: File,
  key: CryptoKey
): Promise<EncryptedPayload> {
  const buffer = await file.arrayBuffer();
  return encryptBuffer(buffer, key);
}

/** Odszyfrowuje surowe bajty pliku, zwraca ArrayBuffer gotowy do Blob(). */
export async function decryptFileWithKey(
  payload: EncryptedPayload,
  key: CryptoKey
): Promise<ArrayBuffer> {
  return decryptBuffer(payload, key);
}

/**
 * Odtwarza obiekt CryptoKey z klucza w URL albo hasła + soli —
 * używane po stronie odbiorcy, zanim odszyfrujemy cokolwiek.
 */
export async function resolveDecryptionKey(
  keyFromUrl?: string,
  password?: string,
  salt?: string | null
): Promise<CryptoKey> {
  if (password && salt) {
    return deriveKeyFromPassword(password, base64UrlToSalt(salt));
  }
  if (keyFromUrl) {
    return importKeyFromBase64Url(keyFromUrl);
  }
  throw new Error("Brak klucza lub hasła potrzebnego do odszyfrowania.");
}

export type { EncryptedPayload };