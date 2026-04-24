import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("site_settings")
    .select("robots_txt")
    .single();

  if (error || !data?.robots_txt) {
    const defaultRobotsTxt = "User-agent: *\nAllow: /";
    return new NextResponse(defaultRobotsTxt, {
      headers: {
        "Content-Type": "text/plain",
      },
    });
  }

  return new NextResponse(data.robots_txt, {
    headers: {
      "Content-Type": "text/plain",
    },
  });
}
