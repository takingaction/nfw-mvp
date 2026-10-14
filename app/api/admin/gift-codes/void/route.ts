import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

const VoidSchema = z
  .object({
    codeId: z.string().uuid().optional(),
    batchId: z.string().uuid().optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .refine((v) => Boolean(v.codeId) !== Boolean(v.batchId), {
    message: "Provide exactly one of codeId or batchId",
  });

/**
 * Void one code, or every still-unredeemed code in a batch.
 * Redeemed codes are never touched. The WHERE clause makes this safe against a
 * redemption happening at the same moment (redeem_gift_code locks the row).
 */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = VoidSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const { codeId, batchId, reason } = parsed.data;

  let q = getAdminClient()
    .from("gift_membership_codes")
    .update({
      voided_at: new Date().toISOString(),
      voided_reason: reason || null,
      voided_by: admin.user?.id ?? null,
    })
    .is("redeemed_at", null)
    .is("voided_at", null);

  q = codeId ? q.eq("id", codeId) : q.eq("batch_id", batchId!);

  const { data, error } = await q.select("id");
  if (error) {
    console.error("Error voiding gift codes:", error);
    return NextResponse.json({ error: "Failed to void codes" }, { status: 500 });
  }

  return NextResponse.json({ voided: data?.length ?? 0 });
}
