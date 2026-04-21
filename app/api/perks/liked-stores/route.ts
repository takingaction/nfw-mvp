import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: likedStores, error } = await supabase
      .from("store_likes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching liked stores:", error);
      return NextResponse.json(
        { error: "Failed to fetch liked stores" },
        { status: 500 }
      );
    }

    return NextResponse.json({ stores: likedStores || [] });
  } catch (error) {
    console.error("Error fetching liked stores:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { store_key, store_name, logo_url } = await request.json();

    if (!store_key || !store_name) {
      return NextResponse.json(
        { error: "store_key and store_name are required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("store_likes")
      .insert({
        user_id: user.id,
        store_key: store_key.toString(),
        store_name,
        logo_url: logo_url || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return NextResponse.json(
          { error: "Store already liked" },
          { status: 409 }
        );
      }
      console.error("Error liking store:", error);
      return NextResponse.json(
        { error: "Failed to like store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, store: data });
  } catch (error) {
    console.error("Error liking store:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { store_key } = await request.json();

    if (!store_key) {
      return NextResponse.json(
        { error: "store_key is required" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("store_likes")
      .delete()
      .eq("user_id", user.id)
      .eq("store_key", store_key.toString());

    if (error) {
      console.error("Error unliking store:", error);
      return NextResponse.json(
        { error: "Failed to unlike store" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error unliking store:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
