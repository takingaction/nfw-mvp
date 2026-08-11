import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";
import { getCategory } from "@/lib/member-categories";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const DB_COLUMNS = [
  "id",
  "email",
  "full_name",
  "membership_level",
  "subscription_status",
  "subscription_ends_at",
  "profile_completed",
  "is_admin",
  "is_approved_free_member",
  "free_membership_contact_submitted",
  "stripe_onboarding_completed",
  "date_of_birth",
  "state",
  "city",
  "zip",
  "phone_number",
  "household_income",
  "avatar_url",
  "address_line1",
  "address_line2",
  "identities",
  "social_handles",
  "stripe_connect_account_id",
  "access_perks_member_id",
  "access_perks_synced_at",
  "waitlist_joined_at",
  "waitlist_email_sent_at",
  "joined_at",
  "updated_at",
  "gift_code_redeemed",
];

const CSV_COLUMNS = [
  "id",
  "email",
  "full_name",
  "category",
  "subscription_status",
  "subscription_ends_at",
  "gift_code_redeemed",
  "profile_completed",
  "is_admin",
  "is_approved_free_member",
  "free_membership_contact_submitted",
  "stripe_onboarding_completed",
  "date_of_birth",
  "state",
  "city",
  "zip",
  "phone_number",
  "household_income",
  "avatar_url",
  "address_line1",
  "address_line2",
  "identities",
  "social_handles",
  "stripe_connect_account_id",
  "access_perks_member_id",
  "access_perks_synced_at",
  "waitlist_joined_at",
  "waitlist_email_sent_at",
  "joined_at",
  "updated_at",
];

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  email: "Email",
  full_name: "Full Name",
  category: "Membership Category",
  subscription_status: "Subscription Status",
  subscription_ends_at: "Subscription Ends At",
  gift_code_redeemed: "Gift Card",
  profile_completed: "Profile Completed",
  is_admin: "Is Admin",
  is_approved_free_member: "Is Approved Free Member",
  free_membership_contact_submitted: "Free Membership Contact Submitted",
  stripe_onboarding_completed: "Stripe Onboarding Completed",
  date_of_birth: "Date of Birth",
  state: "State",
  city: "City",
  zip: "ZIP Code",
  phone_number: "Phone Number",
  household_income: "Household Income",
  avatar_url: "Avatar URL",
  address_line1: "Address Line 1",
  address_line2: "Address Line 2",
  identities: "Identities",
  social_handles: "Social Handles",
  stripe_connect_account_id: "Stripe Connect ID",
  access_perks_member_id: "Access Perks Member ID",
  access_perks_synced_at: "Access Perks Synced At",
  waitlist_joined_at: "Joined Waitlist",
  waitlist_email_sent_at: "Welcome Email Sent",
  joined_at: "Joined At",
  updated_at: "Updated At",
};

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return "";
  }
}

function formatDateTime(value: string | null): string {
  if (!value) return "";
  try {
    const date = new Date(value);
    return date.toISOString().replace("T", " ").substring(0, 19);
  } catch {
    return "";
  }
}

function formatBoolean(value: boolean | null): string {
  if (value === null || value === undefined) return "";
  return value ? "Yes" : "No";
}

function formatArray(value: string[] | null): string {
  if (!value || !Array.isArray(value)) return "";
  return escapeCsvField(value.join("; "));
}

function formatJson(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") {
    return escapeCsvField(JSON.stringify(value));
  }
  return String(value);
}

function formatCell(col: string, value: unknown): string {
  switch (col) {
    case "is_admin":
    case "profile_completed":
    case "is_approved_free_member":
    case "free_membership_contact_submitted":
    case "stripe_onboarding_completed":
    case "gift_code_redeemed":
      return formatBoolean(value as boolean | null);
    case "date_of_birth":
      return formatDate(value as string | null);
    case "subscription_ends_at":
    case "access_perks_synced_at":
    case "waitlist_joined_at":
    case "waitlist_email_sent_at":
    case "joined_at":
    case "updated_at":
      return formatDateTime(value as string | null);
    case "identities":
      return formatArray(value as string[] | null);
    case "social_handles":
      return formatJson(value);
    default:
      return escapeCsvField(value);
  }
}

// Parse M/D/YYYY date string to UTC timestamp
function parseCustomDate(dateStr: string, isStart: boolean): string {
  const parts = dateStr.split("/");
  const year = Number(parts[2]);
  const month = Number(parts[0]) - 1;
  const day = Number(parts[1]);

  let date: Date;
  if (isStart) {
    // Start of day in local time -> UTC
    date = new Date(year, month, day, 0, 0, 0, 0);
    const tzOffset = date.getTimezoneOffset();
    date = new Date(date.getTime() + tzOffset * 60 * 1000);
  } else {
    // End of day in local time -> UTC
    date = new Date(year, month, day, 23, 59, 59, 999);
    const tzOffset = date.getTimezoneOffset();
    date = new Date(date.getTime() + tzOffset * 60 * 1000);
  }

  return date.toISOString();
}

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse date range params for filtering
  const { searchParams } = new URL(request.url);
  const startDateParam = searchParams.get("start_date");
  const endDateParam = searchParams.get("end_date");

  let startISO: string | null = null;
  let endISO: string | null = null;

  if (startDateParam) {
    startISO = parseCustomDate(startDateParam, true);
  }
  if (endDateParam) {
    endISO = parseCustomDate(endDateParam, false);
  }

  const selectColumns = DB_COLUMNS.join(",");

  const pageSize = 1000;
  const allProfiles: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    let query = supabaseAdmin
      .from("profiles")
      .select(selectColumns)
      .order("joined_at", { ascending: false })
      .range(from, from + pageSize - 1);

    // Apply date filtering if provided
    if (startISO) {
      query = query.gte("joined_at", startISO);
    }
    if (endISO) {
      query = query.lte("joined_at", endISO);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Failed to fetch profiles:", error);
      return NextResponse.json(
        { error: "Failed to fetch members", details: error.message },
        { status: 500 }
      );
    }

    if (data && data.length > 0) {
      allProfiles.push(...data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const profiles = allProfiles;

  const validColumns = [...CSV_COLUMNS];
  const headers = validColumns.map((col) => COLUMN_LABELS[col] || col);

  const rows = profiles.map((profile: Record<string, unknown>) => {
    const category = getCategory(profile);
    const enrichedProfile = { ...profile, category } as Record<string, unknown>;
    return validColumns.map((col) => formatCell(col, enrichedProfile[col]));
  });

  const csv = [
    headers.join(","),
    ...rows.map((r: string[]) => r.join(","))
  ].join("\n");

  let filename: string;
  if (startDateParam && endDateParam) {
    filename = `nfw-members-${startDateParam}-to-${endDateParam}.csv`;
  } else {
    const today = new Date().toISOString().split("T")[0];
    filename = `nfw-members-${today}.csv`;
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}