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
      .from("site_contact")
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
      help_heading,
      help_intro,
      help_cards,
      quick_links,
      not_member_heading,
      not_member_subheading,
      meta_title,
      meta_description,
    } = body;

    const contactData = {
      hero_eyebrow: hero_eyebrow || "Real people, real responses",
      hero_headline: hero_headline || "We'd love to hear from you.",
      hero_subheadline: hero_subheadline || "Whether you have a question, need support, or just want to say hi — we're here and we're listening.",
      help_heading: help_heading || "How can we help?",
      help_intro: help_intro || "Our team is made up of real women who care deeply about this community. We read every message and do our best to respond within one business day.",
      help_cards: help_cards || [],
      quick_links: quick_links || [],
      not_member_heading: not_member_heading || "Not a member yet?",
      not_member_subheading: not_member_subheading || "Join thousands of women who have already found relief, connection, and real support through NFW. It's free to get started.",
      meta_title: meta_title || null,
      meta_description: meta_description || null,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabaseAdmin
        .from("site_contact")
        .update(contactData)
        .eq("id", id);

      if (error) {
        console.error("Contact update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    } else {
      const { data, error } = await supabaseAdmin
        .from("site_contact")
        .insert([{ ...contactData }])
        .select()
        .single();

      if (error) {
        console.error("Contact insert error:", error);
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
