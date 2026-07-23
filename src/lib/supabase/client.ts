/**
 * client.ts
 * 
 * Klient Supabase używany w komponentach przeglądarkowych ("use client").
 * Korzysta z klucza "anon" (publicznego) — bezpiecznego dzięki
 * regułom Row Level Security, które zbudowaliśmy w Kroku 3.2.
 */

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}