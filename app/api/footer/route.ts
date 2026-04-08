import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

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
      logo_url,
      column1_heading,
      column1_links,
      column2_heading,
      column2_links,
      column3_heading,
      column3_links,
      column4_heading,
      column4_links,
      copyright_text,
      footer_link1_text,
      footer_link1_url,
      footer_link2_text,
      footer_link2_url,
      footer_link3_text,
      footer_link3_url,
      social_instagram,
      social_tiktok,
      social_facebook,
    } = body;

    const footerData = {
      logo_url: logo_url || null,
      column1_heading: column1_heading || 'MEMBERSHIP',
      column1_links: column1_links || [],
      column2_heading: column2_heading || 'COMMUNITY',
      column2_links: column2_links || [],
      column3_heading: column3_heading || 'ORGANIZATION',
      column3_links: column3_links || [],
      column4_heading: column4_heading || 'CONNECT',
      column4_links: column4_links || [],
      copyright_text: copyright_text || '© 2026 National Fund for Women. All rights reserved.',
      footer_link1_text: footer_link1_text || 'Privacy Policy',
      footer_link1_url: footer_link1_url || '/privacy',
      footer_link2_text: footer_link2_text || 'Terms of Use',
      footer_link2_url: footer_link2_url || '/terms',
      footer_link3_text: footer_link3_text || 'Accessibility',
      footer_link3_url: footer_link3_url || '/accessibility',
      social_instagram: social_instagram || 'https://www.instagram.com/nationalfundforwomen',
      social_tiktok: social_tiktok || 'https://www.tiktok.com/@nationalfundforwomen',
      social_facebook: social_facebook || 'https://www.facebook.com/nationalfundforwomen',
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { error } = await supabaseAdmin
        .from("site_footer")
        .update(footerData)
        .eq("id", id);

      if (error) {
        console.error("Footer update error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, id });
    } else {
      const { data, error } = await supabaseAdmin
        .from("site_footer")
        .insert([{ ...footerData }])
        .select()
        .single();

      if (error) {
        console.error("Footer insert error:", error);
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

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("site_footer")
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
