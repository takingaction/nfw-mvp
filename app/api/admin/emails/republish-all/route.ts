import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminCheck";
import { publishEmail } from "@/lib/email-blocks/publish";
import getAdminClient from "@/lib/supabase/admin";

export const maxDuration = 300;

interface RepublishResult {
  slug: string;
  success: boolean;
  error?: string;
}

export async function POST() {
  const admin = await requireAdmin();
  if (!admin.authorized) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = getAdminClient();
  const { data: templates, error: listError } = await supabase
    .from("email_templates")
    .select("slug, name")
    .eq("status", "published")
    .order("slug", { ascending: true });

  if (listError) {
    return NextResponse.json({ error: "Failed to list templates" }, { status: 500 });
  }

  const rows = templates || [];
  const results: RepublishResult[] = [];

  for (const t of rows) {
    try {
      const result = await publishEmail({ templateSlug: t.slug });
      if (result.success) {
        results.push({ slug: t.slug, success: true });
      } else {
        results.push({ slug: t.slug, success: false, error: result.error || "Unknown error" });
      }
    } catch (err) {
      results.push({
        slug: t.slug,
        success: false,
        error: err instanceof Error ? err.message : "Unexpected error",
      });
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const failedCount = results.length - successCount;

  return NextResponse.json({
    success: failedCount === 0,
    total: rows.length,
    successCount,
    failedCount,
    results,
  });
}
