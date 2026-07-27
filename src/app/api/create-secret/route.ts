import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Limity: maksymalnie 5 nowych sekretów na godzinę, na adres IP.
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      ciphertext,
      iv,
      salt,
      is_password_protected,
      burn_after_reading,
      expires_at,
    } = body;

    // Podstawowa walidacja — nie ufamy niczemu, co przychodzi z przeglądarki
    if (!ciphertext || !iv || !expires_at) {
      return NextResponse.json(
        { error: "Brak wymaganych pól." },
        { status: 400 }
      );
    }

    // Wyciągamy adres IP nadawcy z nagłówków Vercel/Next.js
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    const supabase = createAdminClient();

    // Sprawdzamy limit ZANIM cokolwiek zapiszemy
    const { data: allowed, error: rateLimitError } = await supabase.rpc(
      "check_rate_limit",
      {
        p_ip_hash: ipHash,
        p_limit: RATE_LIMIT_MAX,
        p_window_seconds: RATE_LIMIT_WINDOW_SECONDS,
      }
    );

    if (rateLimitError) {
      console.error("Rate limit check failed:", rateLimitError);
      return NextResponse.json(
        { error: "Błąd wewnętrzny serwera." },
        { status: 500 }
      );
    }

    if (!allowed) {
      return NextResponse.json(
        {
          error:
            "Zbyt wiele prób. Poczekaj chwilę, zanim stworzysz kolejny sekret.",
        },
        { status: 429 }
      );
    }

    // Limit OK — zapisujemy zaszyfrowany sekret
    const newId = crypto.randomUUID();
    const { error: insertError } = await supabase.from("secrets").insert({
      id: newId,
      ciphertext,
      iv,
      salt,
      is_password_protected,
      burn_after_reading,
      expires_at,
    });

    if (insertError) {
      console.error("Insert failed:", insertError);
      return NextResponse.json(
        { error: "Nie udało się zapisać sekretu." },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: newId });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json(
      { error: "Wystąpił nieoczekiwany błąd." },
      { status: 500 }
    );
  }
}