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
      .from("site_signup")
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
      eyebrow,
      headline,
      body_text,
      benefits,
      testimonial_text,
      testimonial_author,
    } = body;

    const signupData = {
      eyebrow: eyebrow || "JOIN WOMEN NATIONWIDE",
      headline: headline || "Become a Member",
      body_text: body_text || "NFW membership helps you get relief for yourself while helping other women at the same time. Membership includes:",
      benefits: benefits || [],
      testimonial_text: testimonial_text || null,
      testimonial_author: testimonial_author || null,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabaseAdmin
        .from("site_signup")
        .update(signupData)
        .eq("id", id);

      if (error) {
        console.error("Signup update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    } else {
      const { data, error } = await supabaseAdmin
        .from("site_signup")
        .insert([{ ...signupData }])
        .select()
        .single();

      if (error) {
        console.error("Signup insert error:", error);
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
