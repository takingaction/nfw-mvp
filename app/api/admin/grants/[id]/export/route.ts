import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) +
    " " +
    date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatBoolean(value: boolean | null): string {
  return value ? "Yes" : "No";
}

function decodeHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const CSV_COLUMNS = [
  "id",
  "status",
  "submitted_at",
  "is_nominating",
  "nominee_name",
  "nominee_email",
  "full_name",
  "email",
  "city",
  "state",
  "date_of_birth",
  "household_income",
  "who_are_you",
  "biggest_challenge",
  "fund_usage",
  "consent_given_at",
  "amount_approved",
];

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  status: "Status",
  submitted_at: "Submitted",
  is_nominating: "Nominating",
  nominee_name: "Nominee Name",
  nominee_email: "Nominee Email",
  full_name: "Full Name",
  email: "Email",
  city: "City",
  state: "State",
  date_of_birth: "Date of Birth",
  household_income: "Household Income",
  who_are_you: "Who Are You",
  biggest_challenge: "Biggest Challenge",
  fund_usage: "Fund Usage",
  consent_given_at: "Consent Given At",
  amount_approved: "Amount Approved",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();

    const { id: cycleId } = await params;

    // Fetch grant cycle name for filename
    const { data: cycle } = await supabaseAdmin
      .from("grant_cycles")
      .select("cycle_name")
      .eq("id", cycleId)
      .single();

    const cycleNameSlug = cycle?.cycle_name
      ? cycle.cycle_name.replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()
      : "grant";

    // Fetch all grants for this cycle with applicant profile data
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from("grants")
      .select(`
        *,
        profiles:user_id (
          full_name,
          email,
          city,
          state,
          date_of_birth,
          household_income
        )
      `)
      .eq("cycle_id", cycleId)
      .order("submitted_at", { ascending: false });

    if (grantsError) {
      console.error("[grants/export] Error fetching grants:", grantsError);
      return NextResponse.json({ error: "Failed to fetch grants" }, { status: 500 });
    }

    // Build CSV
    const headers = CSV_COLUMNS.map((col) => COLUMN_LABELS[col] || col);
    const rows: string[][] = [];

    for (const grant of grants || []) {
      const profile = grant.profiles as any || {};
      const row = [
        grant.id,
        grant.status,
        formatDateTime(grant.submitted_at),
        formatBoolean(grant.is_nominating),
        grant.nominee_name || "",
        grant.nominee_email || "",
        profile.full_name || "",
        profile.email || "",
        profile.city || "",
        profile.state || "",
        formatDate(profile.date_of_birth),
        profile.household_income || "",
        decodeHtml(grant.who_are_you),
        decodeHtml(grant.biggest_challenge),
        decodeHtml(grant.fund_usage),
        formatDateTime(grant.consent_given_at),
        formatCurrency(grant.amount_approved),
      ];
      rows.push(row.map(escapeCsvField));
    }

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const date = new Date().toISOString().split("T")[0];
    const filename = `grant-applicants-${cycleNameSlug}-${date}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[grants/export] Unexpected error:", err);
    return NextResponse.json({ error: "An error occurred" }, { status: 500 });
  }
}