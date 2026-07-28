import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { path } = await request.json();

    if (!path || typeof path !== "string") {
      return NextResponse.json({ error: "Brak ścieżki pliku." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Pobieramy zaszyfrowane bajty ze Storage
    const { data, error } = await supabase.storage
      .from("secret-files")
      .download(path);

    if (error || !data) {
      return NextResponse.json({ error: "Plik nie istnieje." }, { status: 404 });
    }

    // KLUCZOWE: usuwamy plik NATYCHMIAST po udanym odczycie —
    // to zachowuje semantykę "spal po odczycie" również dla plików,
    // niezależnie od tego, że wiersz w tabeli `secrets` mógł już
    // zostać usunięty wcześniej przez get_and_burn_secret.
    await supabase.storage.from("secret-files").remove([path]);

    const arrayBuffer = await data.arrayBuffer();

    return new NextResponse(arrayBuffer, {
      headers: { "Content-Type": "application/octet-stream" },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Błąd pobierania pliku." }, { status: 500 });
  }
}