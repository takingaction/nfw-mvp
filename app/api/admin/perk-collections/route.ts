import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET() {
  try {
    const { data: collections, error } = await supabaseAdmin
      .from("perk_collections")
      .select("*")
      .order("display_order", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!collections || collections.length === 0) {
      return NextResponse.json({ collections: [] });
    }

    // Fetch items for each collection
    const collectionIds = collections.map((c) => c.id);
    const { data: items, error: itemsError } = await supabaseAdmin
      .from("perk_collection_items")
      .select("*")
      .in("collection_id", collectionIds)
      .order("display_order", { ascending: true });

    if (itemsError) {
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    const itemsByCollection = (items || []).reduce((acc, item) => {
      if (!acc[item.collection_id]) {
        acc[item.collection_id] = [];
      }
      acc[item.collection_id].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    const collectionsWithItems = collections.map((collection) => ({
      ...collection,
      items: itemsByCollection[collection.id] || [],
    }));

    return NextResponse.json({ collections: collectionsWithItems });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const { name, description, is_admin_only } = await request.json();

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Get max display_order
    const { data: maxOrder } = await supabaseAdmin
      .from("perk_collections")
      .select("display_order")
      .order("display_order", { ascending: false })
      .limit(1)
      .single();

    const newOrder = (maxOrder?.display_order ?? -1) + 1;

    const { data: collection, error } = await supabaseAdmin
      .from("perk_collections")
      .insert({
        name,
        description: description || null,
        display_order: newOrder,
        is_admin_only: is_admin_only === true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ collection });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
