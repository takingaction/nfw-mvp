import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const COLUMNS = [
  "id",
  "full_name",
  "email",
  "membership_level",
  "subscription_status",
  "date_of_birth",
  "state",
  "city",
  "household_income",
  "identities",
  "subscription_ends_at",
  "joined_at",
  "is_admin",
  "access_perks_synced_at",
];

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  await requireAdmin();

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(COLUMNS.join(","))
    .order("joined_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  const { data: users } = await supabaseAdmin.auth.admin.listUsers();

  const headers = COLUMNS.map((col) => {
    const labels: Record<string, string> = {
      id: "ID",
      full_name: "Full Name",
      email: "Email",
      membership_level: "Membership Level",
      subscription_status: "Subscription Status",
      date_of_birth: "Date of Birth",
      state: "State",
      city: "City",
      household_income: "Household Income",
      identities: "Identities",
      subscription_ends_at: "Subscription Ends At",
      joined_at: "Joined At",
      is_admin: "Is Admin",
      access_perks_synced_at: "Access Perks Synced At",
    };
    return labels[col] || col;
  });

  const rows = (profiles as any[])?.map((profile) => {
    const email = users?.users.find((u: any) => u.id === profile.id)?.email || "N/A";
    return COLUMNS.map((col) => {
      if (col === "email") return escapeCsvField(email);
      if (col === "is_admin") return profile[col] ? "Yes" : "No";
      if (col === "identities") return profile[col] ? JSON.stringify(profile[col]) : "";
      return escapeCsvField(profile[col]);
    });
  });

  const csv = [headers.join(","), ...(rows || []).map((r: string[]) => r.join(","))].join("\n");

  const today = new Date().toISOString().split("T")[0];
  const filename = `nfw-members-${today}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}