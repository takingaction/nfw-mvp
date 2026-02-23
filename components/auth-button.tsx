'use client'

import Link from "next/link";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogoutButton } from "./logout-button";

export function AuthButton() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const supabase = createClient();
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, is_admin')
        .eq('id', userId)
        .single();
      setProfile(profileData);
      setIsAdmin(profileData?.is_admin || false);
    } catch (err) {
      console.error('Profile fetch error:', err);
    }
  }

  useEffect(() => {
    const supabase = createClient();

    // ✅ Step 1: Get current session immediately on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
      setLoading(false);
    });

    // ✅ Step 2: Listen for future auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        setIsOpen(false);

        if (currentUser) {
          await fetchProfile(currentUser.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }

        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="w-10 h-10 rounded-full bg-[#2d1239]/20 animate-pulse" />
    );
  }

  if (!user) {
    return (
      <Button asChild size="sm" variant="default">
        <Link href="/auth/login">Login</Link>
      </Button>
    );
  }

  const firstLetter = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#2d1239] text-white font-bold text-lg flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {firstLetter}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-[#2d1239]/10 py-2 z-20">
            <div className="px-4 py-2 border-b border-[#2d1239]/10">
              <p className="text-sm font-semibold text-[#2d1239]">
                {profile?.full_name || 'Member'}
              </p>
              <p className="text-xs text-[#2d1239]/50">{user.email}</p>
            </div>

            <Link href="/dashboard" className="block px-4 py-2 text-sm text-[#2d1239] hover:bg-[#f8f7fa] transition-colors" onClick={() => setIsOpen(false)}>
              Dashboard
            </Link>
            <Link href="/profile" className="block px-4 py-2 text-sm text-[#2d1239] hover:bg-[#f8f7fa] transition-colors" onClick={() => setIsOpen(false)}>
              My Profile
            </Link>
            <Link href="/grants/my-applications" className="block px-4 py-2 text-sm text-[#2d1239] hover:bg-[#f8f7fa] transition-colors" onClick={() => setIsOpen(false)}>
              My Grants
            </Link>

            {isAdmin && (
              <>
                <div className="border-t border-[#2d1239]/10 my-2" />
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-[#2d1239]/40 uppercase tracking-wider">Admin</p>
                </div>
                <Link href="/admin/grants" className="block px-4 py-2 text-sm text-[#2d1239] hover:bg-[#f8f7fa] transition-colors" onClick={() => setIsOpen(false)}>
                  Manage Grants
                </Link>
                <Link href="/admin/articles" className="block px-4 py-2 text-sm text-[#2d1239] hover:bg-[#f8f7fa] transition-colors" onClick={() => setIsOpen(false)}>
                  Manage Articles
                </Link>
                <Link href="/admin/members" className="block px-4 py-2 text-sm text-[#2d1239] hover:bg-[#f8f7fa] transition-colors" onClick={() => setIsOpen(false)}>
                  Manage Members
                </Link>
              </>
            )}

            <div className="border-t border-[#2d1239]/10 my-2" />
            <div className="px-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}