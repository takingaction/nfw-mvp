import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const CSV_COLUMNS = [
  "id",
  "email",
  "full_name",
  "membership_level",
  "subscription_status",
  "subscription_ends_at",
  "profile_completed",
  "is_admin",
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
  "joined_at",
  "updated_at",
];

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  email: "Email",
  full_name: "Full Name",
  membership_level: "Membership Level",
  subscription_status: "Subscription Status",
  subscription_ends_at: "Subscription Ends At",
  profile_completed: "Profile Completed",
  is_admin: "Is Admin",
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
      return formatBoolean(value as boolean | null);
    case "date_of_birth":
      return formatDate(value as string | null);
    case "subscription_ends_at":
    case "access_perks_synced_at":
    case "joined_at":
    case "created_at":
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

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Select only the columns we need, explicitly named
  const selectColumns = CSV_COLUMNS.join(",");

  // Fetch ALL profiles via pagination to bypass 1000 row limit
  const pageSize = 1000;
  const allProfiles: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(selectColumns)
      .order("joined_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to fetch profiles:", error);
      return NextResponse.json({ error: "Failed to fetch members", details: error.message }, { status: 500 });
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

  // Use CSV_COLUMNS as our canonical column list
  const validColumns = [...CSV_COLUMNS];
  const headers = validColumns.map((col) => COLUMN_LABELS[col] || col);

  const rows = profiles?.map((profile: unknown) => {
    const p = profile as Record<string, unknown>;
    return validColumns.map((col) => formatCell(col, p[col]));
  });

  const csv = [
    headers.join(","),
    ...(rows || []).map((r: string[]) => r.join(","))
  ].join("\n");

  const today = new Date().toISOString().split("T")[0];
  const filename = `nfw-members-${today}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}