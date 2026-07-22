import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Check if user is authenticated and is an admin
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      isAdmin = profile?.is_admin === true;
    }

    // Fetch active collections ordered by display_order
    // If admin, include admin-only collections for testing
    let query = supabase
      .from("perk_collections")
      .select("*")
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (!isAdmin) {
      query = query.eq("is_admin_only", false);
    }

    const { data: collections, error: collectionsError } = await query;

    if (collectionsError) {
      console.error("Error fetching perk collections:", collectionsError);
      return NextResponse.json({ error: collectionsError.message }, { status: 500 });
    }

    if (!collections || collections.length === 0) {
      return NextResponse.json({ collections: [] });
    }

    // Fetch all items for these collections
    const collectionIds = collections.map((c) => c.id);
    const { data: items, error: itemsError } = await supabase
      .from("perk_collection_items")
      .select("*")
      .in("collection_id", collectionIds)
      .order("display_order", { ascending: true });

    if (itemsError) {
      console.error("Error fetching collection items:", itemsError);
      return NextResponse.json({ error: itemsError.message }, { status: 500 });
    }

    // Group items by collection
    const itemsByCollection = (items || []).reduce((acc, item) => {
      if (!acc[item.collection_id]) {
        acc[item.collection_id] = [];
      }
      acc[item.collection_id].push(item);
      return acc;
    }, {} as Record<string, typeof items>);

    // Build response with items attached
    const collectionsWithItems = collections.map((collection) => ({
      ...collection,
      items: itemsByCollection[collection.id] || [],
      item_count: (itemsByCollection[collection.id] || []).length,
    }));

    return NextResponse.json({ collections: collectionsWithItems });
  } catch (error) {
    console.error("Error in GET /api/perk-collections:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
