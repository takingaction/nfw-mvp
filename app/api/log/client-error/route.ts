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

// Slack alert de-dupe (2026-10-01): a member who retries the same failed
// upload several times in a few minutes (e.g. katrinamtyler's 5 alerts in
// 3 minutes) produced one Slack alert per attempt for the same underlying
// problem. Suppress repeat alerts for the same user+cycle+code within a
// 15-minute window. This is a best-effort, per-serverless-instance cache:
// warm-instance bursts (the common case) are deduped; a red lambdas will
// see their own view. A DB-backed log would be needed for a global
// guarantee.
const RECENT_ALERTS = new Map<string, number>();
const DEDUPE_WINDOW_MS = 15 * 60 * 1000;
const DEDUPE_MAX_ENTRIES = 500;

function isDuplicateAlert(key: string): boolean {
  const now = Date.now();
  const last = RECENT_ALERTS.get(key);
  if (last && now - last < DEDUPE_WINDOW_MS) {
    return true;
  }
  RECENT_ALERTS.set(key, now);
  if (RECENT_ALERTS.size > DEDUPE_MAX_ENTRIES) {
    for (const [k, t] of RECENT_ALERTS) {
      if (now - t >= DEDUPE_WINDOW_MS) RECENT_ALERTS.delete(k);
    }
  }
  return false;
}

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
      const dedupeKey = `${userId}|${cycleId}|${asString(body.errorCode, 100) ?? errorMessage}`;
      if (isDuplicateAlert(dedupeKey)) {
        return NextResponse.json({ success: true, suppressed: true });
      }
      await notifyGrantApplicationError({
        userId,
        userEmail,
        cycleId,
        cycleName: asString(body.cycleName) ?? "unknown",
        errorMessage,
        errorCode: asString(body.errorCode, 100),
        // 2026-09-21: forward the HTTP status code so Slack alerts include
        // the response shape (4xx vs 5xx vs JSON-parse failure on HTML).
        httpStatus:
          typeof body.httpStatus === "number"
            ? body.httpStatus
            : undefined,
        // 2026-10-01: forward the failing file's size so transfer-failure
        // alerts can be correlated against the 10 MB cap / connection speed.
        fileSizeBytes:
          typeof body.fileSizeBytes === "number"
            ? body.fileSizeBytes
            : undefined,
        stack,
      });
    } else if (context) {
      const dedupeKey = `${userId}|${context}|${errorMessage}`;
      if (isDuplicateAlert(dedupeKey)) {
        return NextResponse.json({ success: true, suppressed: true });
      }
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
