import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import crypto from "crypto";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a JPEG, PNG, or WebP image." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 2MB." },
        { status: 400 }
      );
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Optimize with sharp: auto-rotate based on EXIF, resize to 400x400 square, convert to WebP
    const optimized = await sharp(buffer)
      .rotate() // Auto-rotate based on EXIF orientation
      .resize(400, 400, {
        fit: "cover",
        position: "center",
      })
      .webp({ quality: 80 })
      .toBuffer();

    // Generate unique filename
    const timestamp = Date.now();
    const randomSuffix = crypto.randomBytes(8).toString("hex");
    const filename = `${user.id}-${timestamp}-${randomSuffix}.webp`;
    const storagePath = `avatars/${filename}`;

    // Delete old avatar if exists
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .single();

    if (profile?.avatar_url) {
      const oldFilename = profile.avatar_url.split("/").pop();
      if (oldFilename) {
        await supabaseAdmin.storage.from("profile-avatars").remove([`avatars/${oldFilename}`]);
      }
    }

    // Ensure bucket exists (private)
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    const bucketExists = buckets?.find(b => b.id === "profile-avatars");

    if (!bucketExists) {
      const { error: bucketError } = await supabaseAdmin.storage
        .createBucket("profile-avatars", {
          public: false, // Private bucket
        });

      if (bucketError) {
        console.error("Failed to create bucket:", bucketError);
        return NextResponse.json(
          { error: "Storage configuration error. Please try again." },
          { status: 500 }
        );
      }
    }

    const { error: uploadError } = await supabaseAdmin.storage
      .from("profile-avatars")
      .upload(storagePath, optimized, {
        contentType: "image/webp",
        cacheControl: "31536000",
      });

    if (uploadError) {
      console.error("Avatar upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload avatar. Please try again." },
        { status: 500 }
      );
    }

    // Create signed URL (valid for 1 year) instead of public URL
    const { data: signedUrl, error: signedError } = await supabaseAdmin.storage
      .from("profile-avatars")
      .createSignedUrl(storagePath, 365 * 24 * 60 * 60); // 1 year in seconds

    if (signedError || !signedUrl) {
      console.error("Failed to create signed URL:", signedError);
      return NextResponse.json(
        { error: "Failed to generate avatar URL. Please try again." },
        { status: 500 }
      );
    }

    const avatarUrl = signedUrl.signedUrl;

    // Notify PostgREST to reload schema cache (in case avatar_url was just added)
    try {
      const { error: rpcError } = await supabaseAdmin.rpc('pgrst_schema_cache_invalidate');
      if (rpcError) {
        console.log("Schema cache invalidation via RPC:", rpcError.message);
      }
    } catch (e) {
      console.log("Schema cache invalidation skipped");
    }

    // Update profile record
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq("id", user.id);

    console.log("Update result - error:", updateError?.message || "none");

    // If update failed (profile might not exist), try INSERT
    if (updateError) {
      console.log("Update failed, trying insert...");
      const { error: insertError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: user.id,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        console.error("Profile insert error:", insertError);
        await supabaseAdmin.storage.from("profile-avatars").remove([storagePath]);
        return NextResponse.json(
          { error: `Failed to save avatar URL: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      avatar_url: avatarUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
