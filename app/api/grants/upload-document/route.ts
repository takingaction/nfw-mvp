import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const grantId = formData.get("grantId") as string;

    if (!file || !grantId) {
      return NextResponse.json(
        { error: "Missing file or grant ID" },
        { status: 400 },
      );
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "File type not allowed" },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 },
      );
    }

    const { data: grant } = await supabaseAdmin
      .from("grants")
      .select("id, user_id")
      .eq("id", grantId)
      .single();

    if (!grant || grant.user_id !== user.id) {
      return NextResponse.json(
        { error: "Grant not found or access denied" },
        { status: 403 },
      );
    }

    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${grantId}/${Date.now()}-${sanitizedName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from("grant-documents")
      .upload(fileName, file);

    if (uploadError) {
      return NextResponse.json(
        { error: "Failed to upload file" },
        { status: 500 },
      );
    }

    const { error: dbError } = await supabaseAdmin
      .from("grant_documents")
      .insert({
        grant_id: grantId,
        document_type: "supporting_doc",
        document_url: fileName,
        file_name: file.name,
        file_size: file.size,
      });

    if (dbError) {
      return NextResponse.json(
        { error: "Failed to save document record" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, path: fileName });
  } catch {
    return NextResponse.json(
      { error: "An error occurred during upload" },
      { status: 500 },
    );
  }
}
