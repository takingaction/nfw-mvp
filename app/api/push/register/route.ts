import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Expo push token registration for the mobile app.
 *
 *   GET    → { tokens: [{ token, platform, enabled, device_name, last_seen_at }] }
 *   POST   { token, platform, deviceName?, enabled? } → upsert own token
 *   DELETE { token } → remove own token (sign-out / opt-out)
 *
 * Auth via createClient() (cookie or Authorization: Bearer). RLS restricts rows to
 * the caller, so the user-context client is used throughout.
 */

const TOKEN_RE = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$/;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("push_tokens")
    .select("token, platform, enabled, device_name, last_seen_at")
    .eq("user_id", user.id)
    .order("last_seen_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to load push tokens" }, { status: 500 });
  return NextResponse.json({ tokens: data ?? [] });
}

export async function POST(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";
  if (!rateLimit(`push-register:${ip}`, 20, 60_000).success) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: unknown; platform?: unknown; deviceName?: unknown; enabled?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  const platform = body.platform === "ios" || body.platform === "android" ? body.platform : null;
  if (!TOKEN_RE.test(token)) return NextResponse.json({ error: "Invalid push token" }, { status: 400 });
  if (!platform) return NextResponse.json({ error: "Invalid platform" }, { status: 400 });

  const now = new Date().toISOString();
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform,
      device_name: typeof body.deviceName === "string" ? body.deviceName.slice(0, 120) : null,
      enabled: body.enabled === undefined ? true : Boolean(body.enabled),
      updated_at: now,
      last_seen_at: now,
    },
    { onConflict: "token" },
  );

  if (error) {
    console.error("[push/register] upsert failed:", error);
    return NextResponse.json({ error: "Failed to register push token" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const { error } = await supabase.from("push_tokens").delete().eq("user_id", user.id).eq("token", token);
  if (error) return NextResponse.json({ error: "Failed to remove push token" }, { status: 500 });
  return NextResponse.json({ success: true });
}
