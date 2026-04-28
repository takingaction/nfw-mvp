"use client";

import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsReady(true);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setIsReady(true);
        return;
      }
      const code = new URLSearchParams(window.location.search).get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          setIsReady(true);
        }
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = createClient();
    setIsLoading(true);
    setError(null);

    try {
      console.log("Attempting to update password...");
      const { data, error: updateError } = await supabase.auth.updateUser({ password });
      console.log("Update result:", data, updateError);
      if (updateError) throw updateError;
      console.log("Password updated successfully, showing success...");
      setIsSuccess(true);
      setTimeout(() => { window.location.href = "/dashboard"; }, 1500);
    } catch (err: unknown) {
      console.error("Password update error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-nfw-blackberry/10">
        <CardHeader>
          <CardTitle className="text-2xl font-serif text-nfw-blackberry">Reset Your Password</CardTitle>
          <CardDescription className="text-nfw-blackberry/60">
            {isSuccess ? "Your password has been updated!" : "Please enter your new password below."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSuccess ? (
            <div className="text-center py-4">
              <p className="text-nfw-aubergine font-serif text-lg">Redirecting to dashboard...</p>
            </div>
          ) : (
            <form onSubmit={handleUpdatePassword}>
              <div className="flex flex-col gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="password" className="text-nfw-blackberry">New password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="New password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="border-nfw-blackberry/20 focus:border-nfw-blackberry focus:ring-nfw-lilac"
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button
                  type="submit"
                  className="w-full bg-nfw-blackberry hover:bg-nfw-blackberry/90"
                  disabled={isLoading}
                >
                  {isLoading ? "Saving..." : "Save new password"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
