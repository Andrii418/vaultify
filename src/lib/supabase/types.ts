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
  ciphertext: string | null;
  iv: string | null;
  salt: string | null;
  is_password_protected: boolean;
  file_path: string | null;
  file_iv: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  is_final_view: boolean;
  remaining_views: number | null;
  decoy_ciphertext: string | null;
  decoy_iv: string | null;
  decoy_salt: string | null;
  has_duress: boolean;
}