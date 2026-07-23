/**
 * index.ts
 * 
 * Publiczne, wysokopoziomowe API silnika kryptograficznego Vaultify.
 * Komponenty React w aplikacji będą importować TYLKO z tego pliku —
 * nie muszą znać szczegółów AES-GCM czy PBKDF2 "pod maską".
 */

import {
  generateEncryptionKey,
  exportKeyToBase64Url,
  importKeyFromBase64Url,
  encryptData,
  decryptData,
  type EncryptedPayload,
} from "./aes";

import {
  generateSalt,
  saltToBase64Url,
  base64UrlToSalt,
  deriveKeyFromPassword,
} from "./password";

/**
 * Kompletny wynik zaszyfrowania sekretu — dokładnie to, co zapiszemy
 * w Supabase (poza kluczem, który trafia do URL, nie do bazy!).
 */
export interface VaultifyEncryptedSecret {
  ciphertext: string;
  iv: string;
  salt: string | null; // null jeśli sekret NIE jest chroniony hasłem
  isPasswordProtected: boolean;
}

/**
 * Wynik funkcji encryptSecret — zawiera zarówno dane do zapisania
 * w bazie (`payload`), jak i klucz, który MUSI trafić do URL,
 * a NIGDY do bazy danych (`keyForUrl`).
 */
export interface EncryptResult {
  payload: VaultifyEncryptedSecret;
  keyForUrl: string | null; // null gdy sekret jest chroniony hasłem —
  // wtedy klucza w ogóle nie umieszczamy w URL, bo wyprowadza się go
  // z hasła znanego tylko nadawcy i odbiorcy
}

/**
 * Główna funkcja szyfrująca. Wywoływana w momencie, gdy użytkownik
 * klika "Stwórz bezpieczny link" w interfejsie.
 * 
 * @param plaintext - tajna treść wpisana przez użytkownika
 * @param password - opcjonalne hasło. Jeśli podane, sekret będzie
 *   wymagał ZARÓWNO linku, JAK I hasła do odszyfrowania.
 */
export async function encryptSecret(
  plaintext: string,
  password?: string
): Promise<EncryptResult> {
  // Scenariusz A: sekret BEZ hasła.
  // Generujemy losowy klucz, który trafi do fragmentu URL.
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

  // Scenariusz B: sekret CHRONIONY HASŁEM.
  // Klucz wyprowadzamy z hasła + losowej soli. Sól zapisujemy jawnie
  // w bazie (jest bezpieczna do ujawnienia). Klucza NIE umieszczamy
  // w URL — bo sam link, bez znajomości hasła, ma nie wystarczać.
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

/**
 * Główna funkcja deszyfrująca. Wywoływana na stronie odbiorcy
 * (Etap 5), gdy ładuje zaszyfrowany sekret z Supabase.
 * 
 * @param payload - dane pobrane z bazy Supabase
 * @param keyFromUrl - klucz wyciągnięty z fragmentu URL (#k=...),
 *   wymagany TYLKO gdy sekret NIE jest chroniony hasłem
 * @param password - hasło wpisane przez odbiorcę, wymagane TYLKO
 *   gdy payload.isPasswordProtected === true
 */
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

  return decryptData(
    { ciphertext: payload.ciphertext, iv: payload.iv },
    key
  );
}

// Re-eksportujemy typ EncryptedPayload na wypadek, gdyby był
// potrzebny gdzieś indziej w aplikacji.
export type { EncryptedPayload };