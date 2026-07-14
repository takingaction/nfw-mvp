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

const ADMIN_STATUS_EVENT = "nfw-admin-status-change";

export function AuthButtonCombined() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const updateAdminStatus = (adminStatus: boolean) => {
    setIsAdmin(adminStatus);
    window.dispatchEvent(new CustomEvent(ADMIN_STATUS_EVENT, { detail: { isAdmin: adminStatus } }));
  };

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const response = await fetch("/api/auth/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          const adminStatus = data.is_admin === true;
          setIsAdmin(adminStatus);
          updateAdminStatus(adminStatus);
          localStorage.setItem("nfw_profile", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    const cachedProfile = localStorage.getItem("nfw_profile");
    if (cachedProfile) {
      const parsed = JSON.parse(cachedProfile) as Profile;
      setProfile(parsed);
      const adminStatus = parsed?.is_admin === true;
      setIsAdmin(adminStatus);
      updateAdminStatus(adminStatus);
    }

    const supabase = createClient();

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
        updateAdminStatus(false);
        localStorage.removeItem("nfw_profile");
        return;
      }

      if (currentUser && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        await fetchProfile(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (!user) {
    return (
      <Link
        href="/auth/sign-up"
        className="inline-flex items-center justify-center px-4 h-10 border border-[#ac9bb6] text-[#ac9bb6] font-bold text-sm hover:bg-[#ac9bb6]/10 transition-all"
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
        className="w-10 h-10 bg-white text-nfw-aubergine font-bold text-lg flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {firstLetter}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl border border-nfw-aubergine/10 py-2 z-60">
            <div className="px-4 py-2 border-b border-nfw-aubergine/10">
              <p className="text-sm font-semibold text-nfw-aubergine">
                {profile?.full_name || "Member"}
              </p>
              <p className="text-xs text-nfw-aubergine/50">{user.email}</p>
            </div>
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-nfw-aubergine hover:bg-nfw-dove"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-nfw-aubergine hover:bg-nfw-dove"
              onClick={() => setIsOpen(false)}
            >
              My Profile
            </Link>
            {isAdmin && (
              <>
                <div className="border-t border-nfw-aubergine/10 mt-1" />
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-nfw-aubergine/40 uppercase tracking-wider">
                    Admin
                  </p>
                </div>
                <Link
                  href="/admin"
                  className="block px-4 py-1 text-sm text-nfw-aubergine hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Admin Dashboard
                </Link>
              </>
            )}
            <div className="border-t border-nfw-aubergine/10 my-2" />
            <div className="px-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}