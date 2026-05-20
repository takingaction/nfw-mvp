import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/login-form";

export const metadata = {
  title: "Member Login | National Fund for Women",
  description:
    "Access your member login to explore support tools, community benefits, exclusive resources, and everything included with your membership.",
};

export default async function Page() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100svh-4rem)] w-full items-center justify-center p-6 md:p-8 bg-nfw-dove">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}