import { NextResponse } from "next/server";
import { Resend } from "resend";
import getAdminClient from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/resend
 *
 * Receives Resend delivery events and updates the matching email_sends row
 * (migration 208), matched on data.email_id = email_sends.resend_email_id.
 *
 * Subscribed events (Resend dashboard → Webhooks):
 *   email.sent, email.delivered, email.delivery_delayed, email.bounced,
 *   email.complained, email.failed, email.suppressed
 *
 * Signature: Svix headers verified with RESEND_WEBHOOK_SECRET.
 *
 * Ordering: Resend doesn't guarantee delivery order and retries failed
 * deliveries, so an event is only applied if it's at least as new as the
 * last one applied (last_event_at). That also makes retries idempotent.
 *
 * Emails not sent through sendEmailBySlug (Supabase auth emails, direct
 * sendBrandedEmail calls) have no row and are acknowledged and ignored.
 */

type TrackedStatus =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

const EVENT_STATUS: Record<string, TrackedStatus> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.delivery_delayed": "delivery_delayed",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
  "email.suppressed": "suppressed",
};

interface ResendEmailEvent {
  type: string;
  created_at: string;
  data: {
    email_id?: string;
    bounce?: { type?: string; subType?: string; message?: string };
    failed?: { reason?: string };
    suppressed?: { type?: string; message?: string };
  };
}

export async function POST(request: Request) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/resend] RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Not configured" }, { status: 500 });
  }

  const payload = await request.text();
  const id = request.headers.get("svix-id");
  const timestamp = request.headers.get("svix-timestamp");
  const signature = request.headers.get("svix-signature");

  if (!id || !timestamp || !signature) {
    return NextResponse.json({ error: "Missing signature headers" }, { status: 400 });
  }

  let event: ResendEmailEvent;
  try {
    event = new Resend(process.env.RESEND_API_KEY).webhooks.verify({
      payload,
      headers: { id, timestamp, signature },
      webhookSecret: secret,
    }) as unknown as ResendEmailEvent;
  } catch (err) {
    console.error("[webhooks/resend] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const status = EVENT_STATUS[event.type];
  const resendEmailId = event.data?.email_id;
  if (!status || !resendEmailId) {
    // Unsubscribed or non-email event — acknowledge so Resend doesn't retry.
    return NextResponse.json({ received: true, ignored: event.type });
  }

  const eventAt = event.created_at || new Date().toISOString();
  const update: Record<string, string | null> = {
    status,
    last_event_at: eventAt,
    updated_at: new Date().toISOString(),
  };

  if (status === "bounced") {
    update.bounce_type = event.data.bounce?.type ?? null;
    update.bounce_subtype = event.data.bounce?.subType ?? null;
    update.error_message = event.data.bounce?.message ?? null;
  } else if (status === "suppressed") {
    update.bounce_subtype = event.data.suppressed?.type ?? null;
    update.error_message = event.data.suppressed?.message ?? null;
  } else if (status === "failed") {
    update.error_message = event.data.failed?.reason ?? null;
  } else if (status === "delivered") {
    // A soft bounce or delay that later delivered is no longer an error.
    update.bounce_type = null;
    update.bounce_subtype = null;
    update.error_message = null;
  }

  const { data, error } = await getAdminClient()
    .from("email_sends")
    .update(update)
    .eq("resend_email_id", resendEmailId)
    .or(`last_event_at.is.null,last_event_at.lte."${eventAt}"`)
    .select("id");

  if (error) {
    console.error("[webhooks/resend] Failed to update email_sends:", error);
    // 500 so Resend retries.
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true, updated: data?.length ?? 0 });
}
