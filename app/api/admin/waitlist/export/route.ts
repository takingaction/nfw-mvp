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
  "state",
  "city",
  "zip",
  "date_of_birth",
  "profile_completed",
  "waitlist_joined_at",
  "waitlist_email_sent_at",
  "is_approved_free_member",
  "joined_at",
];

const COLUMN_LABELS: Record<string, string> = {
  id: "ID",
  email: "Email",
  full_name: "Full Name",
  membership_level: "Membership Level",
  state: "State",
  city: "City",
  zip: "ZIP Code",
  date_of_birth: "Date of Birth",
  profile_completed: "Profile Completed",
  waitlist_joined_at: "Joined Waitlist",
  waitlist_email_sent_at: "Welcome Email Sent",
  is_approved_free_member: "Is Approved",
  joined_at: "Joined At",
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
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const year = date.getUTCFullYear();
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

function formatCell(col: string, value: unknown): string {
  switch (col) {
    case "profile_completed":
    case "is_approved_free_member":
      return formatBoolean(value as boolean | null);
    case "date_of_birth":
      return formatDate(value as string | null);
    case "waitlist_joined_at":
    case "waitlist_email_sent_at":
    case "joined_at":
      return formatDateTime(value as string | null);
    default:
      return escapeCsvField(value);
  }
}

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const selectColumns = CSV_COLUMNS.join(",");

  const pageSize = 1000;
  const allMembers: any[] = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * pageSize;
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select(selectColumns)
      .not("waitlist_joined_at", "is", null)
      .order("waitlist_joined_at", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error("Failed to fetch waitlist members:", error);
      return NextResponse.json(
        { error: "Failed to fetch waitlist members", details: error.message },
        { status: 500 }
      );
    }

    if (data && data.length > 0) {
      allMembers.push(...data);
      page++;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  const validColumns = [...CSV_COLUMNS];
  const headers = validColumns.map((col) => COLUMN_LABELS[col] || col);

  const rows = allMembers.map((member: Record<string, unknown>) => {
    return validColumns.map((col) => formatCell(col, member[col]));
  });

  const csv = [
    headers.join(","),
    ...rows.map((r: string[]) => r.join(","))
  ].join("\n");

  const today = new Date().toISOString().split("T")[0];
  const filename = `nfw-waitlist-${today}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}