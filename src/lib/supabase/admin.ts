/**
 * admin.ts
 *
 * Klient Supabase z kluczem "secret" — działa z pełnymi uprawnieniami,
 * OMIJAJĄC Row Level Security. Dlatego ten plik może być importowany
 * WYŁĄCZNIE w kodzie serwerowym (Route Handlery w folderze api/),
 * NIGDY w komponentach oznaczonych "use client".
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY! // brak NEXT_PUBLIC_ — zmienna tylko serwerowa
  );
}