import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: Request) {
  try {
    const supabase = await createServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const acceptHeader = request.headers.get("accept");
    const wantsCsv = acceptHeader?.includes("text/csv");

    const { data: emails, error } = await supabaseAdmin
      .from("coming_soon_emails")
      .select("email, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching emails:", error);
      return NextResponse.json(
        { error: "Failed to fetch emails" },
        { status: 500 }
      );
    }

    if (wantsCsv) {
      const csvHeader = "Email,Date Submitted\n";
      const csvRows = emails
        .map(
          (row) =>
            `${row.email},${new Date(row.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            })}`
        )
        .join("\n");

      return new Response(csvHeader + csvRows, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": "attachment; filename=coming-soon-emails.csv",
        },
      });
    }

    return NextResponse.json({ emails: emails || [], count: emails?.length || 0 });
  } catch (err) {
    console.error("Admin emails route error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
