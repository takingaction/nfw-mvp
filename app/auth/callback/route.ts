import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  console.log("[Callback] Received code:", !!code);
  console.log("[Callback] Next:", next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[Callback] Exchange error:", error);
    console.log("[Callback] Error message:", error?.message);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      console.log("[Callback] User after exchange:", user?.id);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .single();

        console.log("[Callback] Profile:", profile);

        if (profile?.profile_completed) {
          console.log("[Callback] profile_completed=true, redirect to dashboard");
          redirect("/dashboard");
        } else {
          console.log("[Callback] profile_completed=false, redirect to step 1");
          redirect("/auth/sign-up?step=1");
        }
      }
    }

    redirect(`/auth/error?error=${encodeURIComponent(error?.message || "OAuth callback failed")}`);
  }

  redirect("/auth/error?error=No code provided");
}
