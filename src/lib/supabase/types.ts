/**
 * types.ts
 * 
 * Ręcznie zdefiniowane typy TypeScript odpowiadające strukturze
 * tabeli `secrets` w Supabase. Dzięki temu mamy podpowiadanie
 * składni (autocomplete) i bezpieczeństwo typów przy pracy z bazą.
 */

export interface SecretRow {
  id: string;
  ciphertext: string;
  iv: string;
  salt: string | null;
  is_password_protected: boolean;
  burn_after_reading: boolean;
  created_at: string;
  expires_at: string;
  viewed_at: string | null;
}

// Dane potrzebne do WSTAWIENIA nowego sekretu — bez pól generowanych
// automatycznie przez bazę (id, created_at, viewed_at).
export interface NewSecretInput {
  ciphertext: string;
  iv: string;
  salt: string | null;
  is_password_protected: boolean;
  burn_after_reading: boolean;
  expires_at: string;
}

// Kształt danych zwracanych przez naszą funkcję RPC get_and_burn_secret.
export interface BurnedSecretResult {
  ciphertext: string;
  iv: string;
  salt: string | null;
  is_password_protected: boolean;
}