"use client";

import Link from "next/link";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";

export function AuthButton() {
  const [user, setUser] = useState<any>(undefined);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, is_admin")
        .eq("id", userId)
        .single();
      if (data) {
        setProfile(data);
        setIsAdmin(data.is_admin === true);
        localStorage.setItem("nfw_profile", JSON.stringify(data));
      }
    };

    // Load from cache immediately
    const cachedProfile = localStorage.getItem("nfw_profile");
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile);
      setProfile(parsed);
      setIsAdmin(parsed?.is_admin === true);
    }

    // Get session and fetch fresh profile
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsOpen(false);

      if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsAdmin(false);
        localStorage.removeItem("nfw_profile");
        return;
      }

      if (currentUser && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        await fetchProfile(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) return null;

  if (!user) {
    return (
      <Link
        href="/auth/login"
        className="inline-flex items-center justify-center px-4 h-10 bg-nfw-blackberry text-white font-bold text-sm hover:bg-nfw-blackberry/90 transition-all shadow-sm"
      >
        Login
      </Link>
    );
  }

  const firstLetter = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 bg-nfw-blackberry text-white font-bold text-lg flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {firstLetter}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl border border-nfw-blackberry/10 py-2 z-20">
            <div className="px-4 py-2 border-b border-nfw-blackberry/10">
              <p className="text-sm font-semibold text-nfw-blackberry">
                {profile?.full_name || "Member"}
              </p>
              <p className="text-xs text-nfw-blackberry/50">{user.email}</p>
            </div>
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-nfw-blackberry hover:bg-nfw-dove"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-nfw-blackberry hover:bg-nfw-dove"
              onClick={() => setIsOpen(false)}
            >
              My Profile
            </Link>
            <Link
              href="/grants/my-applications"
              className="block px-4 py-2 text-sm text-nfw-blackberry hover:bg-nfw-dove"
              onClick={() => setIsOpen(false)}
            >
              My Grants
            </Link>
            {isAdmin && (
              <>
                <div className="border-t border-nfw-blackberry/10 mt-1" />
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                <Link
                  href="/admin/pages"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Pages
                </Link>
                <Link
                  href="/admin/header"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Edit Header
                </Link>
                <Link
                  href="/admin/footer"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Edit Footer
                </Link>
                <Link
                  href="/admin/faq"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Edit FAQ
                </Link>
                <Link
                  href="/admin/contact"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Edit Contact
                </Link>
                <Link
                  href="/admin/legal"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Legal Pages
                </Link>
                <Link
                  href="/admin/grants"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Grants
                </Link>
                <Link
                  href="/admin/articles"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Articles
                </Link>
                <Link
                  href="/admin/members"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Members
                </Link>
                <Link
                  href="/admin/shopify"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Zero Dollar Store
                </Link>
                <Link
                  href="/admin/emails"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Email Templates
                </Link>
                <Link
                  href="/admin/gift-codes"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Gift Codes
                </Link>
                <Link
                  href="/admin/coming-soon-emails"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Coming Soon Emails
                </Link>
                <Link
                  href="/admin/analytics"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Analytics
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="block px-4 py-1 text-sm text-nfw-blackberry hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Dashboard
                </Link>
              </>
            )}
            <div className="border-t border-nfw-blackberry/10 my-2" />
            <div className="px-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
