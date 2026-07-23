import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  const { password } = await request.json();

  // Proste porównanie hasła z wartością serwerową — wystarczające
  // do portfolio, ale w prawdziwym produkcie na dużą skalę
  // użylibyśmy pełnego systemu logowania (np. Supabase Auth)
  // zamiast pojedynczego, stałego hasła.
  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Nieprawidłowe hasło." }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("get_public_stats").single();

  if (error) {
    return NextResponse.json({ error: "Błąd pobierania danych." }, { status: 500 });
  }

  return NextResponse.json(data);
}