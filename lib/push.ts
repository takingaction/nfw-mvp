import getAdminClient from "@/lib/supabase/admin";

/**
 * Expo Push Notifications sender (no SDK dependency — plain fetch to Expo's API).
 * https://docs.expo.dev/push-notifications/sending-notifications/
 *
 * Tokens live in `push_tokens` (migration 161), registered by the mobile app.
 * Stale tokens (DeviceNotRegistered) are deleted automatically.
 *
 * All functions are fire-and-forget safe: they never throw.
 */

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const CHUNK = 100;

export interface PushMessage {
  title: string;
  body: string;
  /** Delivered to the app; used for tap routing (e.g. { url: "/grants/<id>" }). */
  data?: Record<string, unknown>;
  sound?: "default" | null;
  badge?: number;
  channelId?: string;
}

interface ExpoTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

/** Send a message to every enabled device token for a user. */
export async function sendPushToUser(userId: string, message: PushMessage): Promise<{ sent: number; failed: number }> {
  try {
    const admin = getAdminClient();
    const { data: rows, error } = await admin.from("push_tokens").select("token").eq("user_id", userId).eq("enabled", true);
    if (error || !rows?.length) return { sent: 0, failed: 0 };
    return await sendToTokens(
      rows.map((r) => r.token as string),
      message,
    );
  } catch (err) {
    console.error("[push] sendPushToUser failed:", err);
    return { sent: 0, failed: 0 };
  }
}

async function sendToTokens(tokens: string[], message: PushMessage): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  for (let i = 0; i < tokens.length; i += CHUNK) {
    const chunk = tokens.slice(i, i + CHUNK);
    const payload = chunk.map((to) => ({
      to,
      title: message.title,
      body: message.body,
      data: message.data ?? {},
      sound: message.sound === undefined ? "default" : message.sound,
      badge: message.badge,
      channelId: message.channelId ?? "default",
      priority: "high",
    }));

    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate",
          ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { data?: ExpoTicket[]; errors?: unknown };
      const tickets = json.data ?? [];
      tickets.forEach((t, idx) => {
        if (t.status === "ok") {
          sent++;
        } else {
          failed++;
          if (t.details?.error === "DeviceNotRegistered") stale.push(chunk[idx]);
          else console.warn("[push] ticket error:", t.message, t.details);
        }
      });
      if (json.errors) console.warn("[push] request errors:", json.errors);
    } catch (err) {
      failed += chunk.length;
      console.error("[push] send chunk failed:", err);
    }
  }

  if (stale.length) {
    try {
      await getAdminClient().from("push_tokens").delete().in("token", stale);
      console.log(`[push] removed ${stale.length} stale token(s)`);
    } catch (err) {
      console.warn("[push] stale token cleanup failed:", err);
    }
  }

  return { sent, failed };
}

// ---------------------------------------------------------------------------
// Grant status notifications
// ---------------------------------------------------------------------------

type GrantPushStatus = "approved" | "not_approved" | "payment_pending" | "payment_sent";

const GRANT_COPY: Record<GrantPushStatus, (cycle: string, amount?: string) => { title: string; body: string }> = {
  approved: (cycle, amount) => ({
    title: "Your microgrant is approved!",
    body: `Great news — your ${cycle} application${amount ? ` for ${amount}` : ""} was approved. Tap to connect your bank account.`,
  }),
  not_approved: (cycle) => ({
    title: "An update on your application",
    body: `Your ${cycle} application wasn't selected this time. Tap for details and future cycles.`,
  }),
  payment_pending: (cycle) => ({
    title: "Payment processing",
    body: `Your ${cycle} grant payment is being processed.`,
  }),
  payment_sent: (cycle, amount) => ({
    title: "Payment sent!",
    body: `Your ${cycle} grant payment${amount ? ` of ${amount}` : ""} is on its way. Allow 1–3 business days.`,
  }),
};

/**
 * Notify a member that their grant status changed. Safe to call without awaiting.
 * `amount` should already be formatted (e.g. "$500").
 */
export function notifyGrantStatus(params: {
  userId: string;
  grantId: string;
  status: string;
  cycleName?: string | null;
  amount?: string | null;
}): Promise<{ sent: number; failed: number }> {
  const status = params.status as GrantPushStatus;
  const copy = GRANT_COPY[status];
  if (!copy) return Promise.resolve({ sent: 0, failed: 0 });
  const { title, body } = copy(params.cycleName || "NFW Microgrant", params.amount || undefined);
  return sendPushToUser(params.userId, {
    title,
    body,
    data: { type: "grant_status", grantId: params.grantId, status, url: `/grants/${params.grantId}` },
  });
}
