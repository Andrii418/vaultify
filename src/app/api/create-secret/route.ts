import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;

// Limit narzucony przez Vercel (serverless function body ~4.5MB) —
// zostawiamy margines bezpieczeństwa.
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export async function POST(request: NextRequest) {
  try {
    // Odczytujemy jako FormData, bo żądanie może zawierać zarówno
    // JSON (metadane) jak i binarny plik naraz — JSON sam w sobie
    // tego nie obsłuży wygodnie.
    const formData = await request.formData();
    const metaRaw = formData.get("meta");
    const file = formData.get("file") as File | null;

    if (!metaRaw || typeof metaRaw !== "string") {
      return NextResponse.json({ error: "Brak metadanych." }, { status: 400 });
    }

    const meta = JSON.parse(metaRaw);
    const {
      ciphertext,
      iv,
      salt,
      is_password_protected,
      burn_after_reading,
      expires_at,
    } = meta;

    if (!expires_at) {
      return NextResponse.json(
        { error: "Brak wymaganych pól." },
        { status: 400 }
      );
    }
    if (!ciphertext && !file) {
      return NextResponse.json(
        { error: "Sekret musi zawierać wiadomość lub plik." },
        { status: 400 }
      );
    }
    if (file && file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Plik jest za duży. Maksymalny rozmiar to 4MB." },
        { status: 413 }
      );
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex");

    const supabase = createAdminClient();

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
          error: `Osiągnięto limit ${RATE_LIMIT_MAX} sekretów na godzinę. Spróbuj ponownie za jakiś czas.`,
        },
        { status: 429 }
      );
    }

    const newId = crypto.randomUUID();

    let filePath: string | null = null;
    let fileIv: string | null = null;
    let fileName: string | null = null;
    let fileMime: string | null = null;
    let fileSize: number | null = null;

    // Plik przychodzi już ZASZYFROWANY z przeglądarki — my tylko
    // zapisujemy go do Storage, nigdy nie widzimy oryginalnej treści.
    if (file) {
      const fileBuffer = await file.arrayBuffer();
      const storagePath = `${newId}/encrypted.bin`;

      const { error: uploadError } = await supabase.storage
        .from("secret-files")
        .upload(storagePath, fileBuffer, {
          contentType: "application/octet-stream",
        });

      if (uploadError) {
        console.error("Storage upload failed:", uploadError);
        return NextResponse.json(
          { error: "Nie udało się zapisać pliku." },
          { status: 500 }
        );
      }

      filePath = storagePath;
      fileIv = meta.file_iv;
      fileName = meta.file_name;
      fileMime = meta.file_mime;
      fileSize = meta.file_size_original;
    }

    const { error: insertError } = await supabase.from("secrets").insert({
      id: newId,
      ciphertext: ciphertext ?? null,
      iv: iv ?? null,
      salt,
      is_password_protected,
      burn_after_reading,
      expires_at,
      file_path: filePath,
      file_iv: fileIv,
      file_name: fileName,
      file_mime: fileMime,
      file_size: fileSize,
    });

    if (insertError) {
      console.error("Insert failed:", insertError);
      // Jeśli zapis wiersza się nie udał, a plik już wgraliśmy —
      // sprzątamy po sobie, żeby nie zostawiać sierot w Storage.
      if (filePath) {
        await supabase.storage.from("secret-files").remove([filePath]);
      }
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