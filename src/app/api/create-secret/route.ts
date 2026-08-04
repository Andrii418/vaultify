import { NextRequest, NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_SECONDS = 60 * 60;
const MAX_FILE_SIZE_BYTES = 4 * 1024 * 1024; // 4MB

export async function POST(request: NextRequest) {
  try {
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
      max_views,
      expires_at,
      notify_email,
      is_split,
      share_threshold,
      share_total,
      decoy_ciphertext,
      decoy_iv,
      decoy_salt,
      has_duress,
    } = meta;

    if (!expires_at) {
      return NextResponse.json({ error: "Brak wymaganych pól." }, { status: 400 });
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
    if (notify_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(notify_email)) {
      return NextResponse.json(
        { error: "Nieprawidłowy adres e-mail." },
        { status: 400 }
      );
    }
    if (is_split) {
      if (file) {
        return NextResponse.json(
          { error: "Pliki nie są obsługiwane w trybie podziału sekretu." },
          { status: 400 }
        );
      }
      if (
        !Number.isInteger(share_threshold) ||
        !Number.isInteger(share_total) ||
        share_threshold < 2 ||
        share_total < share_threshold ||
        share_total > 10
      ) {
        return NextResponse.json(
          { error: "Nieprawidłowe parametry podziału sekretu." },
          { status: 400 }
        );
      }
    }
    if (has_duress) {
      if (file) {
        return NextResponse.json(
          { error: "Pliki nie są obsługiwane w trybie hasła-wabika." },
          { status: 400 }
        );
      }
      if (!decoy_ciphertext || !decoy_iv || !decoy_salt) {
        return NextResponse.json(
          { error: "Brak danych treści-wabika." },
          { status: 400 }
        );
      }
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
      return NextResponse.json({ error: "Błąd wewnętrzny serwera." }, { status: 500 });
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
        return NextResponse.json({ error: "Nie udało się zapisać pliku." }, { status: 500 });
      }

      filePath = storagePath;
      fileIv = meta.file_iv;
      fileName = meta.file_name;
      fileMime = meta.file_mime;
      fileSize = meta.file_size_original;
    }

    const finalMaxViews: number | null = is_split
      ? null
      : file
      ? 1
      : max_views ?? null;

    const { error: insertError } = await supabase.from("secrets").insert({
      id: newId,
      ciphertext: ciphertext ?? null,
      iv: iv ?? null,
      salt,
      is_password_protected,
      max_views: finalMaxViews,
      expires_at,
      file_path: filePath,
      file_iv: fileIv,
      file_name: fileName,
      file_mime: fileMime,
      file_size: fileSize,
      notify_email: notify_email || null,
      is_split: !!is_split,
      share_threshold: is_split ? share_threshold : null,
      share_total: is_split ? share_total : null,
      decoy_ciphertext: has_duress ? decoy_ciphertext : null,
      decoy_iv: has_duress ? decoy_iv : null,
      decoy_salt: has_duress ? decoy_salt : null,
      has_duress: !!has_duress,
    });

    if (insertError) {
      console.error("Insert failed:", insertError);
      if (filePath) {
        await supabase.storage.from("secret-files").remove([filePath]);
      }
      return NextResponse.json({ error: "Nie udało się zapisać sekretu." }, { status: 500 });
    }

    return NextResponse.json({ id: newId });
  } catch (err) {
    console.error("Unexpected error:", err);
    return NextResponse.json({ error: "Wystąpił nieoczekiwany błąd." }, { status: 500 });
  }
}