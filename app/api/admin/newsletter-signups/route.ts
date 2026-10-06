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

    const PAGE_SIZE = 1000;
    const allEmails: { email: string; created_at: string }[] = [];
    let fetchPage = 0;
    let fetchHasMore = true;

    while (fetchHasMore) {
      const from = fetchPage * PAGE_SIZE;
      const { data: pageData, error: pageError } = await supabaseAdmin
        .from("coming_soon_emails")
        .select("email, created_at")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE_SIZE - 1);

      if (pageError) {
        console.error("Error fetching emails:", pageError);
        return NextResponse.json(
          { error: "Failed to fetch emails" },
          { status: 500 }
        );
      }

      if (pageData && pageData.length > 0) {
        allEmails.push(...pageData);
        fetchPage++;
        fetchHasMore = pageData.length === PAGE_SIZE;
      } else {
        fetchHasMore = false;
      }
    }

    const emails = allEmails;

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
          "Content-Disposition": "attachment; filename=newsletter-signups.csv",
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