import { NextResponse } from "next/server";
import { getCachedActivePopups } from "@/lib/cms-cache";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const currentPath = searchParams.get("path") || "/";

    // Active popups are cached (lib/cms-cache.ts); the date window is applied
    // here per request so scheduled popups still start/stop on time.
    const now = Date.now();
    const popups = await getCachedActivePopups();

    const activePopups = popups.filter((popup) => {
      if (popup.start_date && new Date(popup.start_date).getTime() > now) return false;
      if (popup.end_date && new Date(popup.end_date).getTime() < now) return false;
      const targets = popup.target_pages || [];
      return targets.includes("*") || targets.includes(currentPath);
    });

    return NextResponse.json({ popups: activePopups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
