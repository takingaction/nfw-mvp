import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { notifyGrantApplicationError } from "@/lib/slack-notifications";

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      userId,
      userEmail,
      cycleId,
      cycleName,
      errorMessage,
      errorCode,
      stack,
    } = body;

    if (!userId || !cycleId || !errorMessage) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await notifyGrantApplicationError({
      userId,
      userEmail: userEmail || "unknown",
      cycleId,
      cycleName: cycleName || "unknown",
      errorMessage,
      errorCode,
      stack,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[log/client-error] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
