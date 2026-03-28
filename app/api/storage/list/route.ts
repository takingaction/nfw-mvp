import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface ListFilesRequest {
  bucket: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body: ListFilesRequest = await request.json();
    const { bucket, search, limit = 20, offset = 0 } = body;

    if (!bucket) {
      return NextResponse.json({ error: "Bucket is required" }, { status: 400 });
    }

    // List files from storage
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from(bucket)
      .list("", {
        limit: 100, // Get more to filter and paginate
        sortBy: { column: "created_at", order: "desc" },
      });

    if (listError) {
      console.error("Error listing storage files:", listError);
      return NextResponse.json({ error: "Failed to list files" }, { status: 500 });
    }

    // Filter out folders and non-image files
    let imageFiles = (files || []).filter((file) => {
      // Skip folders
      if (file.id === null && file.name) return false;
      // Only include images
      const ext = file.name.toLowerCase().split(".").pop();
      return ["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext || "");
    });

    // Apply search filter
    if (search && search.trim()) {
      const searchLower = search.toLowerCase();
      imageFiles = imageFiles.filter((file) =>
        file.name.toLowerCase().includes(searchLower)
      );
    }

    // Get total before pagination
    const total = imageFiles.length;

    // Apply pagination
    imageFiles = imageFiles.slice(offset, offset + limit);

    // Generate signed URLs and thumbnail URLs for each file
    const filesWithUrls = await Promise.all(
      imageFiles.map(async (file) => {
        // Get public URL for the file
        const { data: urlData } = supabaseAdmin.storage
          .from(bucket)
          .getPublicUrl(file.name);

        // Generate signed URL (valid for 1 hour)
        const { data: signedData, error: signError } = await supabaseAdmin.storage
          .from(bucket)
          .createSignedUrl(file.name, 3600);

        if (signError) {
          console.error("Error creating signed URL:", signError);
        }

        // Create thumbnail URL by appending resize params (Supabase imgproxy)
        // Format: ?width=200&height=200&resize=cover
        const thumbnailUrl = urlData.publicUrl + "?w=200&h=200&resize=cover";
        const originalUrl = signedData?.signedUrl || urlData.publicUrl;

        return {
          name: file.name,
          url: originalUrl,
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
