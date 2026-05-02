import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

const supabaseAdmin = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

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

        // Defensive: create profile if it doesn't exist
        if (!profile) {
          console.log("[AuthCallback] Profile not found, creating minimal profile for user:", user.id);
          const { error: insertError } = await supabaseAdmin
            .from("profiles")
            .insert({
              id: user.id,
              full_name: "Member",
              date_of_birth: "1900-01-01",
              membership_level: "free",
              profile_completed: false,
            });

          if (insertError) {
            console.error("[AuthCallback] Failed to create profile:", insertError);
          } else {
            console.log("[AuthCallback] Profile created successfully for user:", user.id);
          }
        }

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
