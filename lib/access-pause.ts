/**
 * Admin "pause" of a member's access (migration 205). Server-only.
 *
 * A pause leaves tier / subscription / Stripe untouched; lib/member-access.ts
 * treats a paused member as locked out of everything past the dashboard.
 *
 * Optional dispute link: if the pause carries a Stripe dispute id (dp_...),
 * a charge.dispute.closed event with status "won" for that dispute unpauses
 * the member automatically (see handleDisputeClosedForPause).
 */
import getAdminClient from "@/lib/supabase/admin";

const DISPUTE_ID_RE = /^dp_[A-Za-z0-9]+$/;

export interface PauseResult {
  ok: boolean;
  error?: string;
  email?: string | null;
}

export function isValidDisputeId(id: string): boolean {
  return DISPUTE_ID_RE.test(id);
}

export async function pauseMemberAccess(params: {
  memberId: string;
  adminId: string;
  reason: string;
  disputeId?: string | null;
}): Promise<PauseResult> {
  const reason = params.reason.trim();
  const disputeId = params.disputeId?.trim() || null;
  if (!reason) return { ok: false, error: "A reason is required" };
  if (reason.length > 500) return { ok: false, error: "Reason is too long (500 characters max)" };
  if (disputeId && !isValidDisputeId(disputeId)) {
    return { ok: false, error: "Dispute ID should look like dp_..." };
  }

  const { data, error } = await getAdminClient()
    .from("profiles")
    .update({
      access_paused_at: new Date().toISOString(),
      access_paused_reason: reason,
      access_paused_by: params.adminId,
      access_paused_dispute_id: disputeId,
    })
    .eq("id", params.memberId)
    .select("email")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Member not found" };
  return { ok: true, email: data.email };
}

export async function unpauseMemberAccess(memberId: string): Promise<PauseResult> {
  const { data, error } = await getAdminClient()
    .from("profiles")
    .update({
      access_paused_at: null,
      access_paused_reason: null,
      access_paused_by: null,
      access_paused_dispute_id: null,
    })
    .eq("id", memberId)
    .select("email")
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Member not found" };
  return { ok: true, email: data.email };
}

/**
 * Called from the Stripe webhook on charge.dispute.closed.
 * won  → unpause members whose pause is linked to this dispute
 * lost → leave them paused, alert Slack so an admin decides next steps
 * Never throws: dispute reversal handling must continue regardless.
 */
export async function handleDisputeClosedForPause(dispute: {
  id: string;
  status: string;
}): Promise<void> {
  try {
    if (dispute.status !== "won" && dispute.status !== "lost") return;

    const admin = getAdminClient();
    const { data: members, error } = await admin
      .from("profiles")
      .select("id, email")
      .eq("access_paused_dispute_id", dispute.id)
      .not("access_paused_at", "is", null);

    if (error) {
      console.error("[access-pause] dispute lookup failed:", error);
      return;
    }
    if (!members || members.length === 0) return;

    for (const m of members) {
      if (dispute.status === "won") {
        const res = await unpauseMemberAccess(m.id);
        await notifyAccessPauseChange({
          action: res.ok ? "auto_unpaused" : "auto_unpause_failed",
          memberId: m.id,
          email: m.email,
          disputeId: dispute.id,
          detail: res.ok ? "Dispute closed as won." : `Dispute won but unpause failed: ${res.error}`,
        });
      } else {
        await notifyAccessPauseChange({
          action: "dispute_lost",
          memberId: m.id,
          email: m.email,
          disputeId: dispute.id,
          detail: "Dispute closed as lost. Member remains paused — unpause manually if appropriate.",
        });
      }
    }
  } catch (err) {
    console.error("[access-pause] handleDisputeClosedForPause error:", err);
  }
}

type PauseAction = "paused" | "unpaused" | "auto_unpaused" | "auto_unpause_failed" | "dispute_lost";

const PAUSE_HEADLINES: Record<PauseAction, string> = {
  paused: "⏸️ Member access paused",
  unpaused: "▶️ Member access unpaused",
  auto_unpaused: "▶️ Member access auto-unpaused (dispute won)",
  auto_unpause_failed: "🔴 Auto-unpause failed - ACTION REQUIRED",
  dispute_lost: "⚠️ Dispute lost - member still paused",
};

export async function notifyAccessPauseChange(params: {
  action: PauseAction;
  memberId: string;
  email?: string | null;
  reason?: string | null;
  disputeId?: string | null;
  adminEmail?: string | null;
  detail?: string;
}): Promise<void> {
  const webhookUrl = process.env.SLACK_REFUND_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn("[notifyAccessPauseChange] SLACK_REFUND_WEBHOOK_URL not configured, skipping notification");
    return;
  }
  const headline = PAUSE_HEADLINES[params.action];
  const lines = [
    `*${headline}*`,
    `• Member: ${params.email || "unknown email"} (${params.memberId})`,
    params.reason ? `• Reason: ${params.reason}` : null,
    params.disputeId ? `• Dispute: ${params.disputeId}` : null,
    params.adminEmail ? `• By: ${params.adminEmail}` : null,
    params.detail ? `• ${params.detail}` : null,
  ].filter(Boolean);

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: headline,
        blocks: [{ type: "section", text: { type: "mrkdwn", text: lines.join("\n") } }],
      }),
    });
    if (!response.ok) {
      console.error("[notifyAccessPauseChange] Slack responded", response.status, response.statusText);
    }
  } catch (err) {
    console.error("[notifyAccessPauseChange] Error sending Slack notification:", err);
  }
}
