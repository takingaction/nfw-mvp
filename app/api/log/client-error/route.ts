import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { notifyClientError, notifyGrantApplicationError } from "@/lib/slack-notifications";

/**
 * Client-side error sink → Slack.
 *
 * Two shapes are accepted (both require a session — cookie or Bearer):
 *
 *  1. Grant application failure (web GrantApplicationForm, mobile grants/apply):
 *     { cycleId, cycleName?, errorMessage, errorCode?, stack? }
 *  2. Generic client error (mobile error boundary / errorReporter):
 *     { context, message | errorMessage, stack?, extra?, platform?, appVersion? }
 *
 * Identity always comes from the verified session, never from the body.
 */

const MAX_MESSAGE = 1000;

function asString(v: unknown, max = MAX_MESSAGE): string | undefined {
  return typeof v === "string" && v.length > 0 ? v.substring(0, max) : undefined;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

    const userId = user.id;
    const userEmail = user.email ?? asString(body.userEmail) ?? "unknown";
    const errorMessage = asString(body.errorMessage) ?? asString(body.message);
    const stack = asString(body.stack, 2000);
    const cycleId = asString(body.cycleId);
    const context = asString(body.context, 200);

    if (!errorMessage) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (cycleId) {
      await notifyGrantApplicationError({
        userId,
        userEmail,
        cycleId,
        cycleName: asString(body.cycleName) ?? "unknown",
        errorMessage,
        errorCode: asString(body.errorCode, 100),
        stack,
      });
    } else if (context) {
      await notifyClientError({
        userId,
        userEmail,
        context,
        errorMessage,
        platform: asString(body.platform, 40),
        appVersion: asString(body.appVersion, 40),
        stack,
        extra:
          body.extra && typeof body.extra === "object" && !Array.isArray(body.extra)
            ? (body.extra as Record<string, unknown>)
            : undefined,
      });
    } else {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[log/client-error] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
