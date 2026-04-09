/**
 * Access Perks Member AMT API Integration
 * Syncs NFW members with Access Perks platform
 */

interface AccessMemberImport {
  organization_customer_identifier: string;
  program_customer_identifier: string;
  member_customer_identifier: string;
  first_name: string;
  last_name: string;
  email_address: string;
  member_status: "OPEN" | "SUSPEND";
  previous_member_customer_identifier?: string;
}

interface Profile {
  id: string;
  full_name: string;
  subscription_status: string;
  [key: string]: unknown;
}

/**
 * Sanitize member_customer_identifier to meet Access requirements:
 * - Alphanumeric only (no special characters)
 * - Uppercase
 * - Trimmed
 */
function sanitizeMemberIdentifier(userId: string): string {
  return userId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Split full name into first and last name for Access Perks
 * Handles edge cases like single names (mononyms)
 */
function splitFullName(fullName: string): {
  firstName: string;
  lastName: string;
} {
  const trimmed = fullName.trim();

  if (!trimmed) {
    return { firstName: "Member", lastName: "Member" };
  }

  const parts = trimmed.split(" ").filter((p) => p.length > 0);

  if (parts.length === 0) {
    return { firstName: "Member", lastName: "Member" };
  }

  if (parts.length === 1) {
    // Single name (e.g., "Madonna") - use same value for both
    return { firstName: parts[0], lastName: parts[0] };
  }

  // Multiple parts: first word = firstName, rest = lastName
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ");

  return { firstName, lastName };
}

/**
 * Import/sync members with Access Perks
 */
export async function syncAccessMembers(members: AccessMemberImport[]) {
  try {
    const response = await fetch(`${process.env.ACCESS_AMT_API_URL}/imports`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "Access-Token": process.env.ACCESS_AMT_TOKEN!,
      },
      body: JSON.stringify({
        import: {
          members: members,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `Access AMT API Error: ${error.message || response.statusText}`,
      );
    }

    const result = await response.json();

    if (result.invalid_members_csv) {
      console.warn(
        "Some members failed validation:",
        result.invalid_members_csv,
      );
    }

    return result;
  } catch (error) {
    console.error("Failed to sync Access members:", error);
    throw error;
  }
}

/**
 * Create/update a single Access Perks member
 */
export async function syncAccessMember(
  userId: string,
  firstName: string,
  lastName: string,
  email: string,
  status: "OPEN" | "SUSPEND" = "OPEN",
) {
  const member: AccessMemberImport = {
    organization_customer_identifier: process.env.ACCESS_ORGANIZATION_ID!,
    program_customer_identifier: process.env.ACCESS_PROGRAM_ID!,
    member_customer_identifier: sanitizeMemberIdentifier(userId),
    first_name: firstName,
    last_name: lastName,
    email_address: email,
    member_status: status,
  };

  return syncAccessMembers([member]);
}

/**
 * Helper: Convert NFW profile to Access member format
 */
export function profileToAccessMember(
  profile: Profile,
  userId: string,
  userEmail: string,
) {
  const { firstName, lastName } = splitFullName(profile.full_name || "");
  const status = profile.subscription_status === "active" ? "OPEN" : "SUSPEND";

  return {
    userId,
    firstName,
    lastName,
    email: userEmail,
    status: status as "OPEN" | "SUSPEND",
  };
}

/**
 * Check if member needs sync and sync with Access Perks if needed.
 * Idempotent - only syncs if access_perks_member_id is null.
 */
export async function checkAndSyncAccessMember(
  supabase: any,
  userId: string,
  userEmail: string,
): Promise<{ synced: boolean; error?: string }> {
  console.log("[checkAndSyncAccessMember] Starting with:", { userId, userEmail });
  
  try {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .is("access_perks_member_id", null)
      .single();

    console.log("[checkAndSyncAccessMember] Profile query result:", { profile, profileError });

    if (profileError || !profile) {
      console.log("[checkAndSyncAccessMember] Profile not found or already synced, returning synced: false");
      return { synced: false };
    }

    console.log("[checkAndSyncAccessMember] Profile found, syncing to Access Perks...");
    const memberData = profileToAccessMember(profile, userId, userEmail);
    console.log("[checkAndSyncAccessMember] Member data:", memberData);

    await syncAccessMember(
      memberData.userId,
      memberData.firstName,
      memberData.lastName,
      memberData.email,
      memberData.status,
    );

    const sanitizedMemberId = sanitizeMemberIdentifier(userId);
    console.log("[checkAndSyncAccessMember] Updating profile with member ID:", sanitizedMemberId);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        access_perks_member_id: sanitizedMemberId,
        access_perks_synced_at: new Date().toISOString(),
      })
      .eq("id", userId);

    console.log("[checkAndSyncAccessMember] Update result:", { updateError });

    return { synced: true };
  } catch (error) {
    console.error("[checkAndSyncAccessMember] Error:", error);
    return {
      synced: false,
      error: error instanceof Error ? error.message : "Sync failed",
    };
  }
}
