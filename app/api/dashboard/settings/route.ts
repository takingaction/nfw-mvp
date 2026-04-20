import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("dashboard_settings")
      .select("*")
      .limit(1)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("Error fetching dashboard settings:", error);
      return NextResponse.json(
        { error: "Failed to fetch settings" },
        { status: 500 }
      );
    }

    const settings = data || {};

    // Enrich microgrant items with fresh image URLs from grant_cycles
    if (settings.featured_items && Array.isArray(settings.featured_items)) {
      const micrograntItems = settings.featured_items.filter(
        (item: any) => item.type === "microgrant" && !item.image
      );

      if (micrograntItems.length > 0) {
        const grantIds = micrograntItems.map((item: any) => item.id.replace("grant_", ""));
        const { data: grantCycles } = await supabaseAdmin
          .from("grant_cycles")
          .select("id, featured_image")
          .in("id", grantIds);

        if (grantCycles && grantCycles.length > 0) {
          const grantImageMap = new Map(grantCycles.map(g => [g.id, g.featured_image]));
          settings.featured_items = settings.featured_items.map((item: any) => {
            if (item.type === "microgrant" && !item.image) {
              const grantId = item.id.replace("grant_", "");
              return { ...item, image: grantImageMap.get(grantId) || "" };
            }
            return item;
          });
        }
      }
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching dashboard settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const {
      hero_image_url,
      featured_items,
      square_image1_url,
      square_image1_link,
      square_image2_url,
      square_image2_link,
      square_image3_url,
      square_image3_link,
      badge_free_url,
      badge_contributing_url,
      badge_founding_url,
    } = body;

    const updates = {
      ...(hero_image_url !== undefined && { hero_image_url }),
      ...(featured_items !== undefined && { featured_items }),
      ...(square_image1_url !== undefined && { square_image1_url }),
      ...(square_image1_link !== undefined && { square_image1_link }),
      ...(square_image2_url !== undefined && { square_image2_url }),
      ...(square_image2_link !== undefined && { square_image2_link }),
      ...(square_image3_url !== undefined && { square_image3_url }),
      ...(square_image3_link !== undefined && { square_image3_link }),
      ...(badge_free_url !== undefined && { badge_free_url }),
      ...(badge_contributing_url !== undefined && { badge_contributing_url }),
      ...(badge_founding_url !== undefined && { badge_founding_url }),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("dashboard_settings")
      .update(updates)
      .eq("id", "00000000-0000-0000-0000-000000000001");

    if (error) {
      console.error("Error updating dashboard settings:", error);
      return NextResponse.json(
        { error: "Failed to update settings" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating dashboard settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
