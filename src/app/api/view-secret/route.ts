import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";


interface RpcResult {
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
  notify_email: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Brak identyfikatora." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .rpc("get_and_burn_secret", { secret_id: id })
      .single<RpcResult>();

    if (error) {
      let status = 404;
      let code = "SECRET_NOT_FOUND";

      if (error.message.includes("SECRET_EXPIRED")) {
        code = "SECRET_EXPIRED";
        status = 410;
      } else if (error.message.includes("SECRET_ALREADY_VIEWED")) {
        code = "SECRET_ALREADY_VIEWED";
        status = 410;
      }

      return NextResponse.json({ error: code }, { status });
    }

    // Wysyłka powiadomienia e-mail — planujemy ją przez after(),
    // które gwarantuje dokończenie zadania w tle NAWET PO wysłaniu
    // odpowiedzi do przeglądarki. Bez tego Vercel może przedwcześnie
    // zamrozić funkcję, zanim fetch() do Resend zdąży się zakończyć
    // (dokładnie to powodowało błąd "write ETIMEDOUT").
    if (data.notify_email && process.env.RESEND_API_KEY) {
      const emailToNotify = data.notify_email;
      after(async () => {
        try {
          await sendViewNotification(emailToNotify);
        } catch (err) {
          console.error("Nie udało się wysłać powiadomienia e-mail:", err);
        }
      });
    }

    // Nigdy nie zwracamy notify_email z powrotem do przeglądarki —
    // to prywatne dane nadawcy, przeglądarce odbiorcy niepotrzebne.
    const { notify_email: _omit, ...safeResult } = data;

    return NextResponse.json(safeResult);
  } catch (err) {
    console.error("View secret error:", err);
    return NextResponse.json({ error: "SECRET_NOT_FOUND" }, { status: 500 });
  }
}

async function sendViewNotification(toEmail: string) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Vaultify <onboarding@resend.dev>",
      to: toEmail,
      subject: "Twój sekret został odczytany",
      html: `
        <div style="font-family: sans-serif; max-width: 480px;">
          <h2 style="color: #0a0a0c;">🔓 Sekret został odczytany</h2>
          <p>Ktoś właśnie otworzył link do sekretu, który udostępniłeś przez Vaultify.</p>
          <p style="color: #666; font-size: 13px;">
            To powiadomienie zawiera wyłącznie fakt odczytania —
            Vaultify nigdy nie ma dostępu do treści Twojego sekretu.
          </p>
        </div>
      `,
    }),
  });
}