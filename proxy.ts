import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest, NextResponse } from "next/server";

export async function proxy(request: NextRequest) {
  // Skip auth check for webhook route
  if (request.nextUrl.pathname.startsWith('/api/webhook')) {
    return NextResponse.next();
  }
  
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * - api/webhook (Stripe webhook)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|api/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};