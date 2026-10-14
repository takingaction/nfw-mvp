import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import getAdminClient from "@/lib/supabase/admin";
import { buildRedeemUrl, csvCell, formatGiftCodeForPrint, getSiteUrl } from "@/lib/gift-codes";

const PAGE = 1000;

/**
 * Printer CSV for one batch. One row per card.
 *   ?scope=available (default) -> only codes that can still be redeemed
 *   ?scope=all                 -> every code with its status (for reconciliation)
 *
 * Printer instructions: "Variable data print. Generate a QR code from
 * redeem_url and print code as text below it."
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  const scope = request.nextUrl.searchParams.get("scope") === "all" ? "all" : "available";
  const supabase = getAdminClient();

  const { data: batch, error: batchError } = await supabase
    .from("gift_code_batches")
    .select("id, name, tier, membership_months, expires_at")
    .eq("id", id)
    .single();

  if (batchError || !batch) {
    return NextResponse.json({ error: "Batch not found" }, { status: 404 });
  }

  // PostgREST caps rows per request, so page through.
  const rows: { code: string; redeemed_at: string | null; voided_at: string | null; redeemed_by_email: string | null }[] = [];
  for (let from = 0; ; from += PAGE) {
    let q = supabase
      .from("gift_membership_codes")
      .select("code, redeemed_at, voided_at, redeemed_by_email")
      .eq("batch_id", id)
      .order("created_at", { ascending: true })
      .order("code", { ascending: true })
      .range(from, from + PAGE - 1);
    if (scope === "available") q = q.is("redeemed_at", null).is("voided_at", null);
    const { data, error } = await q;
    if (error) {
      console.error("Error exporting batch codes:", error);
      return NextResponse.json({ error: "Failed to export codes" }, { status: 500 });
    }
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) break;
  }

  const siteUrl = getSiteUrl();
  const expiresOn = batch.expires_at
    ? new Date(batch.expires_at).toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" })
    : "";

  const header = ["seq", "code", "redeem_url", "batch", "tier", "expires_on"];
  if (scope === "all") header.push("status", "redeemed_at", "redeemed_by_email");

  const lines = [header.join(",")];
  rows.forEach((r, i) => {
    const cells: unknown[] = [
      i + 1,
      formatGiftCodeForPrint(r.code),
      buildRedeemUrl(r.code, siteUrl),
      batch.name,
      batch.tier,
      expiresOn,
    ];
    if (scope === "all") {
      cells.push(
        r.voided_at ? "voided" : r.redeemed_at ? "redeemed" : "available",
        r.redeemed_at ?? "",
        r.redeemed_by_email ?? "",
      );
    }
    lines.push(cells.map(csvCell).join(","));
  });

  const slug = batch.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "batch";
  const filename = `${slug}-${scope === "all" ? "all-codes" : "printer"}.csv`;

  // BOM so Excel opens UTF-8 correctly; CRLF per RFC 4180.
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
