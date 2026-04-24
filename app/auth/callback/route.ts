import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("profile_completed")
          .eq("id", user.id)
          .single();

        if (profile?.profile_completed) {
          redirect("/dashboard");
        } else {
          redirect("/auth/sign-up?step=1");
        }
      }
    }

    redirect(`/auth/error?error=${encodeURIComponent(error?.message || "OAuth callback failed")}`);
  }

  redirect("/auth/error?error=No code provided");
}
