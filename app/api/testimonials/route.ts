import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendStoryNotificationEmail } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      email,
      age,
      city,
      state,
      drawnToMembership,
      programsEngaged,
      favoritePart,
      howNfwHelped,
      whyJoin,
      permissionGranted,
      preferAnonymous,
      interestedVideo,
    } = body;

    if (!name || !email || !age || permissionGranted === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase.from("testimonials").insert({
      user_id: user.id,
      name,
      email,
      age,
      city,
      state,
      drawn_to_membership: drawnToMembership,
      programs_engaged: programsEngaged,
      favorite_part: favoritePart,
      how_nfw_helped: howNfwHelped,
      why_join: whyJoin,
      permission_granted: permissionGranted,
      prefer_anonymous: preferAnonymous,
      interested_video: interestedVideo,
    });

    if (insertError) {
      console.error("[testimonials] Insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save story" },
        { status: 500 }
      );
    }

    await sendStoryNotificationEmail({
      name,
      email,
      age,
      city,
      state,
      drawnToMembership,
      programsEngaged,
      favoritePart,
      howNfwHelped,
      whyJoin,
      permissionGranted,
      preferAnonymous,
      interestedVideo,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[testimonials] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}