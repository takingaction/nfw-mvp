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

  useEffect(() => {
    const getUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Get profile for full name and admin status
        const { data: profileData } = await supabase
          .from('profiles')
          .select('full_name, is_admin')
          .eq('id', user.id)
          .single();
        
        setProfile(profileData);
        setIsAdmin(profileData?.is_admin || false);
      }
    };
    getUser();
  }, []);

  // Not logged in - show login button
  if (!user) {
    return (
      <Button asChild size="sm" variant={"default"}>
        <Link href="/auth/login">Login</Link>
      </Button>
    );
  }

  // Get first letter for avatar
  const firstLetter = profile?.full_name 
    ? profile.full_name.charAt(0).toUpperCase()
    : user.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="relative">
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-full bg-[#2d1239] text-white font-bold text-lg flex items-center justify-center hover:opacity-80 transition-opacity"
      >
        {firstLetter}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-20">
            {/* User info */}
            <div className="px-4 py-2 border-b border-gray-200">
              <p className="text-sm font-semibold text-gray-900">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* User Links - UPDATED */}
            <Link
              href="/dashboard"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              Dashboard
            </Link>
            <Link
              href="/profile"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              My Profile
            </Link>
            <Link
              href="/grants/my-applications"
              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              onClick={() => setIsOpen(false)}
            >
              My Grants
            </Link>

            {/* Admin Links - Only show if admin */}
            {isAdmin && (
              <>
                <div className="border-t border-gray-200 my-2" />
                <div className="px-4 py-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Admin</p>
                </div>
                <Link
                  href="/admin/grants"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Grants
                </Link>
                <Link
                  href="/admin/articles"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Articles
                </Link>
                <Link
                  href="/admin/members"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Members
                </Link>
              </>
            )}

            {/* Logout */}
            <div className="border-t border-gray-200 my-2" />
            <div className="px-4 py-2">
              <LogoutButton />
            </div>
          </div>
        </>
      )}
    </div>
  );
}