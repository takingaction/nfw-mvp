import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Parse the URL to determine item type and identifier
    // Formats:
    // - /perks/{offerKey} -> access_perk
    // - /perks/nfw/{slug} -> nfw_perk
    let itemType: "access_perk" | "nfw_perk" | null = null;
    let itemIdentifier: string | null = null;

    try {
      const parsed = new URL(url, "https://nationalfundforwomen.org");
      const path = parsed.pathname;

      const nfwMatch = path.match(/^\/perks\/nfw\/([^\/]+)$/);
      if (nfwMatch) {
        itemType = "nfw_perk";
        itemIdentifier = nfwMatch[1];
      } else {
        const accessMatch = path.match(/^\/perks\/([^\/]+)$/);
        if (accessMatch) {
          itemType = "access_perk";
          itemIdentifier = accessMatch[1];
        }
      }
    } catch {
      // If URL parsing fails, try regex on the raw URL
      const nfwMatch = url.match(/\/perks\/nfw\/([^\/]+)/);
      if (nfwMatch) {
        itemType = "nfw_perk";
        itemIdentifier = nfwMatch[1];
      } else {
        const accessMatch = url.match(/\/perks\/([^\/]+)/);
        if (accessMatch) {
          itemType = "access_perk";
          itemIdentifier = accessMatch[1];
        }
      }
    }

    if (!itemType || !itemIdentifier) {
      return NextResponse.json(
        { error: "Invalid perk URL. Use format: /perks/{offerKey} or /perks/nfw/{slug}" },
        { status: 400 }
      );
    }

    // Get max display_order for this collection
    const { data: maxOrder } = await supabaseAdmin
      .from("perk_collection_items")
      .select("display_order")
      .eq("collection_id", id)
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order ?? -1) + 1;

    const { data: item, error } = await supabaseAdmin
      .from("perk_collection_items")
      .insert({
        collection_id: id,
        item_type: itemType,
        item_identifier: itemIdentifier,
        display_order: newOrder,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "This perk is already in this collection" },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

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

    const { itemId } = await request.json();

    if (!itemId) {
      return NextResponse.json({ error: "itemId is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("perk_collection_items")
      .delete()
      .eq("id", itemId)
      .eq("collection_id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
