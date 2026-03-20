"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";
import type { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
}

export function AuthButtonCombined() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
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

    const cachedProfile = localStorage.getItem("nfw_profile");
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile) as Profile;
      setProfile(parsed);
      setIsAdmin(parsed?.is_admin === true);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
    });

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
        href="/auth/sign-up"
        className="inline-flex items-center justify-center px-4 h-10 border border-white text-white rounded-lg font-bold text-sm hover:bg-white/10 transition-all"
      >
        Join Now
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
        className="w-10 h-10 rounded-full bg-white text-[#3e155f] font-bold text-lg flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {firstLetter}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#3e155f]/10 py-2 z-20">
            <div className="px-4 py-2 border-b border-[#3e155f]/10">
              <p className="text-sm font-semibold text-[#3e155f]">
                {profile?.full_name || "Member"}
              </p>
              <p className="text-xs text-[#3e155f]/50">{user.email}</p>
            </div>
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
              onClick={() => setIsOpen(false)}
            >
              My Profile
            </Link>
            <Link
              href="/grants/my-applications"
              className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
              onClick={() => setIsOpen(false)}
            >
              My Grants
            </Link>
            {isAdmin && (
              <>
                <div className="border-t border-[#3e155f]/10 my-2" />
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-[#3e155f]/40 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                <Link
                  href="/admin/pages"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Pages
                </Link>
                <Link
                  href="/admin/header"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Edit Header
                </Link>
                <Link
                  href="/admin/footer"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Edit Footer
                </Link>
                <Link
                  href="/admin/grants"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Grants
                </Link>
                <Link
                  href="/admin/articles"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Articles
                </Link>
                <Link
                  href="/admin/members"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Members
                </Link>
                <Link
                  href="/admin/analytics"
                  className="block px-4 py-2 text-sm text-[#3e155f] hover:bg-[#f8f7fa]"
                  onClick={() => setIsOpen(false)}
                >
                  Analytics
                </Link>
              </>
            )}
            <div className="border-t border-[#3e155f]/10 my-2" />
            <div className="px-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}