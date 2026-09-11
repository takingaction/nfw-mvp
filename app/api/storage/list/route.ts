import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js";

const ALLOWED_BUCKETS = ["page-builder", "article-images", "store-items", "profile-avatars"];

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
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

    if (profile?.is_admin !== true) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { bucket, search, limit = 20, offset = 0 } = body;

    if (!bucket) {
      return NextResponse.json({ error: "Bucket is required" }, { status: 400 });
    }

    if (!ALLOWED_BUCKETS.includes(bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // List files from storage - check both root and common subfolders
    const foldersToCheck = ["", "sections", "images"];
    let allFiles: any[] = [];
    
    for (const folder of foldersToCheck) {
      const folderPath = folder || undefined;
      const { data: files, error: listError } = await supabaseAdmin.storage
        .from(bucket)
        .list(folderPath, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });
      
      if (!listError && files) {
        // Add folder prefix to file names if in subfolder
        const filesWithPrefix = files.map((file: any) => ({
          ...file,
          name: folder ? `${folder}/${file.name}` : file.name,
        }));
        allFiles = [...allFiles, ...filesWithPrefix];
      }
    }

    // Filter out folders and non-image files
    let imageFiles = allFiles.filter((file: any) => {
      // Skip folders (files with no metadata)
      if (!file.metadata) return false;
      // Only include images
      const ext = file.name.toLowerCase().split(".").pop();
      return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
    });

    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      imageFiles = imageFiles.filter((file: any) =>
        file.name.toLowerCase().includes(searchLower)
      );
    }

    // Get total before pagination
    const total = imageFiles.length;

    // Apply pagination
    imageFiles = imageFiles.slice(offset, offset + limit);

    // Generate signed URLs and thumbnail URLs for each file
    const filesWithUrls = await Promise.all(
      imageFiles.map(async (file: any) => {
        // Get public URL for the file
        const { data: urlData } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(file.name);

        // Create thumbnail URL by appending resize params (Supabase imgproxy)
        // Format: ?width=200&height=200&resize=cover
        const thumbnailUrl = urlData.publicUrl + "?w=200&h=200&resize=cover";

        return {
          name: file.name,
          url: urlData.publicUrl,
          thumbnailUrl: thumbnailUrl,
          created_at: file.created_at,
          size: file.metadata?.size || 0,
        };
      })
    );

    const hasMore = offset + limit < total;

    return NextResponse.json({
      files: filesWithUrls,
      total,
      hasMore,
    });
  } catch (error) {
    console.error("List storage error:", error);
    return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
  }
}
