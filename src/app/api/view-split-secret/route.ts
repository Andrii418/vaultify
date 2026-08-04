import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "Brak identyfikatora." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("secrets")
      .select("ciphertext, iv, is_split, share_threshold, share_total, expires_at")
      .eq("id", id)
      .single();

    if (error || !data || !data.is_split) {
      return NextResponse.json({ error: "SECRET_NOT_FOUND" }, { status: 404 });
    }

    if (new Date(data.expires_at) < new Date()) {
      await supabase.from("secrets").delete().eq("id", id);
      return NextResponse.json({ error: "SECRET_EXPIRED" }, { status: 410 });
    }

    return NextResponse.json({
      ciphertext: data.ciphertext,
      iv: data.iv,
      shareThreshold: data.share_threshold,
      shareTotal: data.share_total,
    });
  } catch (err) {
    console.error("View split secret error:", err);
    return NextResponse.json({ error: "SECRET_NOT_FOUND" }, { status: 500 });
  }
}