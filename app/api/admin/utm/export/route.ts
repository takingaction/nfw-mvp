import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
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

  const { data: links, error } = await supabase
    .from("utm_links")
    .select("campaign_title, utm_campaign, destination_url, utm_source, utm_medium, utm_content, utm_term, created_by_email, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const escapeCsvField = (field: string | null): string => {
    if (field === null || field === undefined) return "";
    const str = String(field);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  };

  const buildUtmUrl = (link: typeof links[0]): string => {
    if (!link) return "";
    try {
      const url = new URL(link.destination_url);
      url.searchParams.set("utm_source", link.utm_source || "");
      url.searchParams.set("utm_medium", link.utm_medium || "");
      url.searchParams.set("utm_campaign", link.utm_campaign || "");
      if (link.utm_content) url.searchParams.set("utm_content", link.utm_content);
      if (link.utm_term) url.searchParams.set("utm_term", link.utm_term);
      return url.toString();
    } catch {
      return link.destination_url;
    }
  };

  const csvRows = [
    "Campaign,Slug,Link,Created By,Created On",
    ...(links || []).map(
      (link) =>
        `${escapeCsvField(link.campaign_title || link.utm_campaign)},${escapeCsvField(link.utm_campaign)},${escapeCsvField(buildUtmUrl(link))},${escapeCsvField(link.created_by_email)},${formatDate(link.created_at)}`
    ),
  ];

  const csvContent = csvRows.join("\n");

  const today = new Date().toISOString().split("T")[0];

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="utm-campaign-log-${today}.csv"`,
    },
  });
}
