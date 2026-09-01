"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
  is_reviewer: boolean | null;
}

interface NavLink {
  label: string;
  url: string;
  indent?: number;
}

interface MobileMenuProps {
  navLinks?: NavLink[];
}

export default function MobileMenu({ navLinks = [] }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isReviewer, setIsReviewer] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Group navLinks into sections (parent items with indent=0 and their children)
  const sections = [];
  let i = 0;
  while (i < navLinks.length) {
    const link = navLinks[i];
    if (!link.indent || link.indent === 0) {
      const children = [];
      let j = i + 1;
      while (j < navLinks.length && (navLinks[j].indent ?? 0) > 0) {
        children.push(navLinks[j]);
        j++;
      }
      sections.push({ parent: link, children });
      i = j;
    } else {
      i++;
    }
  }

  const closeMenu = () => {
    setIsOpen(false);
    setAuthOpen(false);
    setOpenSections({});
  };

  const toggleSection = (label: string) => {
    setOpenSections(prev => ({ ...prev, [label]: !prev[label] }));
  };

  useEffect(() => {
    const fetchProfile = async (userId: string) => {
      try {
        const response = await fetch("/api/auth/profile");
        if (response.ok) {
          const data = await response.json();
          setProfile(data);
          setIsAdmin(data.is_admin === true);
          setIsReviewer(data.is_reviewer === true);
          localStorage.setItem("nfw_profile", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      }
    };

    // Load from localStorage cache immediately
    const cached = localStorage.getItem("nfw_profile");
    if (cached) {
      const parsed = JSON.parse(cached);
      setProfile(parsed);
      setIsAdmin(parsed?.is_admin === true);
      setIsReviewer(parsed?.is_reviewer === true);
    }

    const supabase = createClient();

    supabase.auth.getUser().then(async ({ data: { user: currentUser } }) => {
      setUser(currentUser ?? null);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setIsAdmin(false);
        setIsReviewer(false);
        localStorage.removeItem("nfw_profile");
        return;
      }
      if (currentUser && (event === "SIGNED_IN" || event === "USER_UPDATED")) {
        await fetchProfile(currentUser.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    localStorage.removeItem("nfw_profile");
    window.location.href = "/auth/login";
  };

  const firstLetter = profile?.full_name
    ? profile.full_name.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  const linkClass =
    "block px-4 py-2 text-white/80 hover:bg-white/10 transition-colors";

  return (
    <>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 text-white bg-white/10 transition-colors"
        aria-label="Toggle menu"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 z-40" onClick={closeMenu} />
      )}

      {/* Slide-out Menu */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-nfw-blackberry shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <span className="text-xl font-black text-white">Menu</span>
            <button
              onClick={closeMenu}
              className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Menu Items */}
          <div className="flex-1 overflow-y-auto p-4">
            <nav className="space-y-2">
              {/* Dynamic sections from navLinks */}
              {sections.map(({ parent, children }) => (
                <div key={parent.label}>
                  <button
                    onClick={() => toggleSection(parent.label)}
                    className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                  >
                    {parent.label}
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${openSections[parent.label] ? "rotate-180" : ""}`}
                    />
                  </button>
                  {openSections[parent.label] && (
                    <div className="ml-4 mt-1 space-y-1">
                      {children.map((child, idx) => (
                        <Link
                          key={idx}
                          href={child.url}
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Donate Button */}
              <div className="pt-2">
                <Link
                  href="https://www.zeffy.com/en-US/donation-form/national-fund-for-women-foundation"
                  target="_blank"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-3 bg-nfw-citrine text-nfw-blackberry font-bold hover:bg-nfw-citrine/90 transition-colors"
                >
                  Donate
                </Link>
              </div>
            </nav>
          </div>

          {/* Footer - Auth Section */}
          <div className="p-4 border-t border-white/10">
            {user ? (
              <div>
                <button
                  onClick={() => setAuthOpen(!authOpen)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <div className="w-10 h-10 bg-nfw-lilac text-nfw-blackberry font-bold text-lg flex items-center justify-center flex-shrink-0">
                    {firstLetter}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-semibold text-white">
                      {profile?.full_name || "Member"}
                    </p>
                    <p className="text-xs text-white/60">{user.email}</p>
                  </div>
                  <ChevronDown
                    className={`w-4 h-4 text-white transition-transform ${authOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {authOpen && (
                  <div className="mt-2 space-y-1">
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Dashboard
                    </Link>
                    <Link
                      href="/profile"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      My Profile
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="border-t border-white/10 mt-1" />
                        <p className="px-4 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider">
                          Admin
                        </p>
                        <Link
                          href="/admin"
                          onClick={closeMenu}
                          className="block px-4 py-1 text-white/80 hover:bg-white/10 transition-colors"
                        >
                          Admin Dashboard
                        </Link>
                      </>
                    )}
                    {isReviewer && !isAdmin && (
                      <Link
                        href="/admin/grants"
                        onClick={closeMenu}
                        className="block px-4 py-2 text-white/80 hover:bg-white/10 transition-colors"
                      >
                        Manage Grants
                      </Link>
                    )}
                    <div className="border-t border-white/10 my-2" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-white/80 hover:bg-white/10 transition-colors"
                >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Link
                  href="/auth/login"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/auth/sign-up"
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-semibold hover:bg-nfw-citrine/90 transition-colors"
                >
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
