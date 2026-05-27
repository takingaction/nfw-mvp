import { NextRequest, NextResponse } from "next/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/adminCheck";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const PROFILE_COLUMNS = [
  "id",
  "full_name",
  "membership_level",
  "subscription_status",
  "date_of_birth",
  "state",
  "city",
  "household_income",
  "subscription_ends_at",
  "joined_at",
  "is_admin",
  "access_perks_synced_at",
];

const CSV_COLUMNS = [
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
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profiles, error } = await supabaseAdmin
    .from("profiles")
    .select(PROFILE_COLUMNS.join(","))
    .order("joined_at", { ascending: false });

  if (error) {
    console.error("Failed to fetch profiles:", error);
    return NextResponse.json({ error: "Failed to fetch members" }, { status: 500 });
  }

  // Fetch all users from auth.users directly
  const { data: authUsers, error: authError } = await supabaseAdmin
    .from("auth.users")
    .select("id, email, identities");

  if (authError) {
    console.error("Failed to fetch auth users:", authError);
  }

  // Debug: log first few auth users to see structure
  if (authUsers && authUsers.length > 0) {
    const firstGoogleUser = authUsers.find(u => !u.email && u.identities);
    if (firstGoogleUser) {
      console.log("[members export] Google user structure:", {
        id: firstGoogleUser.id,
        email: firstGoogleUser.email,
        hasIdentities: !!firstGoogleUser.identities,
        identitiesLength: firstGoogleUser.identities?.length,
        firstIdentity: firstGoogleUser.identities?.[0],
      });
    } else {
      console.log("[members export] No Google users (OAuth) found, first user:", {
        id: authUsers[0]?.id,
        email: authUsers[0]?.email,
        hasIdentities: !!authUsers[0]?.identities,
      });
    }
  }

  const userMap = new Map<string, string>();
  if (authUsers) {
    for (const u of authUsers) {
      // OAuth users may have email in identities
      const email = u.email || u.identities?.[0]?.identity_data?.email || null;
      if (u.id && email) {
        userMap.set(u.id, email);
      }
    }
  }

  console.log("[members export] profiles count:", profiles?.length, "userMap size:", userMap.size, "authUsers count:", authUsers?.length);

console.log("[members export] profiles count:", profiles?.length, "userMap size:", userMap.size, "authUsers count:", authUsers?.length);

  const headers = CSV_COLUMNS.map((col) => {
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
    const email = userMap.get(profile.id) || "N/A";
    return CSV_COLUMNS.map((col) => {
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