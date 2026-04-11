import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_faq")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || null);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      hero_eyebrow,
      hero_headline,
      hero_subheadline,
      hero_background,
      faq_sections,
      still_have_questions_heading,
      still_have_questions_subheading,
      still_have_questions_buttons,
    } = body;

    const faqData = {
      hero_eyebrow: hero_eyebrow || "We've got answers",
      hero_headline: hero_headline || "Questions? We've got answers.",
      hero_subheadline: hero_subheadline || "Everything you need to know about NFW membership, microgrants, perks, and more.",
      hero_background: hero_background || "aubergine",
      faq_sections: faq_sections || [],
      still_have_questions_heading: still_have_questions_heading || "Still have questions?",
      still_have_questions_subheading: still_have_questions_subheading || "We're here to help. Reach out and a real person will get back to you.",
      still_have_questions_buttons: still_have_questions_buttons || [],
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabaseAdmin
        .from("site_faq")
        .update(faqData)
        .eq("id", id);

      if (error) {
        console.error("FAQ update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    } else {
      const { data, error } = await supabaseAdmin
        .from("site_faq")
        .insert([{ ...faqData }])
        .select()
        .single();

      if (error) {
        console.error("FAQ insert error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id: data.id });
    }
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
