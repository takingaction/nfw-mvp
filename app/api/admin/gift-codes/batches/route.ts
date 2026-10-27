import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";

import { siteEndOfDay } from "@/lib/dates";
const CreateBatchSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  quantity: z.coerce.number().int().min(1).max(20000),
  tier: z.enum(["contributing", "founding"]).default("contributing"),
  membershipMonths: z.coerce.number().int().min(1).max(60).default(12),
  // YYYY-MM-DD; codes stop working at the end of that day (Pacific).
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullish()
    .or(z.literal("")),
  notes: z.string().trim().max(2000).nullish(),
});

/** List print batches with redemption tracking. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data, error } = await getAdminClient()
    .from("gift_code_batch_stats")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching gift code batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }

  return NextResponse.json({ batches: data ?? [] });
}

/** Create a print batch of N unique codes (all-or-nothing). */
export async function POST(request: Request) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const parsed = CreateBatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, quantity, tier, membershipMonths, expiresOn, notes } = parsed.data;

  // End of the chosen day in Pacific time (handles PST/PDT).
  const expiresAt: string | null = expiresOn ? siteEndOfDay(expiresOn).toISOString() : null;

  const supabase = getAdminClient();
  const { data: batchId, error } = await supabase.rpc("create_gift_code_batch", {
    p_name: name,
    p_quantity: quantity,
    p_tier: tier,
    p_membership_months: membershipMonths,
    p_expires_at: expiresAt,
    p_notes: notes ?? null,
    p_created_by: admin.user?.id ?? null,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "A batch with that name already exists" }, { status: 409 });
    }
    console.error("Error creating gift code batch:", error);
    return NextResponse.json({ error: error.message || "Failed to create batch" }, { status: 500 });
  }

  const { data: batch } = await supabase
    .from("gift_code_batch_stats")
    .select("*")
    .eq("id", batchId)
    .single();

  return NextResponse.json({ batch });
}
