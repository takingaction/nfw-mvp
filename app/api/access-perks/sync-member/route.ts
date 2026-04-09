import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  syncAccessMember,
  profileToAccessMember,
} from "@/lib/access-perks/member-sync";

function sanitizeMemberIdentifier(userId: string): string {
  return userId
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const supabase = await createClient();

    // Get authenticated user from session
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the userId matches the authenticated user (security check)
    if (user.id !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email from auth user object
    const userEmail = user.email;
    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 },
      );
    }

    // Fetch user profile - only if access_perks_member_id is null (idempotency check)
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .is("access_perks_member_id", null)
      .single();

    if (profileError || !profile) {
      // Either profile doesn't exist or already synced
      console.log("[sync-member] Profile not found or already synced:", { profileError, profile });
      return NextResponse.json({ 
        success: false, 
        message: profileError ? "Profile not found" : "Already synced" 
      });
    }

    // Convert profile to Access format
    const memberData = profileToAccessMember(profile, userId, userEmail);

    // Sync with Access Perks
    const result = await syncAccessMember(
      memberData.userId,
      memberData.firstName,
      memberData.lastName,
      memberData.email,
      memberData.status,
    );

    const sanitizedMemberId = sanitizeMemberIdentifier(userId);

    // Update profile with sync timestamp and member ID
    await supabase
      .from("profiles")
      .update({
        access_perks_synced_at: new Date().toISOString(),
        access_perks_member_id: sanitizedMemberId,
      })
      .eq("id", userId);

    return NextResponse.json({ success: true, result });
  } catch (error: unknown) {
    console.error("Member sync error:", error);
    const message = error instanceof Error ? error.message : "Failed to sync member";
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
