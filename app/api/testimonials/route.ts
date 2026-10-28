import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendStoryNotificationEmail } from "@/lib/email";
import {
  STORY_PROGRAM_VALUES,
  STORY_TEXT_PROMPTS,
  US_STATES,
  type StoryTextKey,
} from "@/lib/storyForm";

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

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

    const name = str(body.name);
    const email = str(body.email);
    const age = str(body.age);
    const city = str(body.city);
    const state = str(body.state);

    if (!name || !email || !age || !city || !state) {
      return NextResponse.json(
        { error: "Please complete all Member Information fields." },
        { status: 400 }
      );
    }

    if (!(US_STATES as readonly string[]).includes(state)) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    const text = Object.fromEntries(
      (Object.keys(STORY_TEXT_PROMPTS) as StoryTextKey[]).map((k) => [k, str(body[k]) || null])
    ) as Record<StoryTextKey, string | null>;

    const rawPrograms: unknown = body.programsUsed ?? [];
    if (
      !Array.isArray(rawPrograms) ||
      rawPrograms.some((p) => typeof p !== "string" || !STORY_PROGRAM_VALUES.includes(p))
    ) {
      return NextResponse.json({ error: "Invalid program selection" }, { status: 400 });
    }
    const programsUsed = Array.from(new Set(rawPrograms as string[]));

    const hasStoryAnswer = Object.values(text).some(Boolean) || programsUsed.length > 0;
    if (!hasStoryAnswer) {
      return NextResponse.json(
        { error: "Please answer at least one of the story prompts." },
        { status: 400 }
      );
    }

    const permissionGranted = body.permissionGranted === true;
    // Anonymity only has meaning when NFW may quote the submission.
    const preferAnonymous = permissionGranted && body.preferAnonymous === true;
    const interestedVideo = body.interestedVideo === true;

    const { error: insertError } = await supabase.from("testimonials").insert({
      user_id: user.id,
      name,
      email,
      age,
      city,
      state,
      how_nfw_helped: text.howNfwHelped,
      surprised_by: text.surprisedBy,
      programs_used: programsUsed,
      improvement_ideas: text.improvementIdeas,
      feedback: text.feedback,
      why_join: text.whyJoin,
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
      ...text,
      programsUsed,
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
