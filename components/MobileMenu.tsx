"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

interface Profile {
  full_name: string | null;
  is_admin: boolean | null;
}

export default function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [membershipOpen, setMembershipOpen] = useState(false);
  const [programsOpen, setProgramsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const closeMenu = () => {
    setIsOpen(false);
    setAboutOpen(false);
    setMembershipOpen(false);
    setProgramsOpen(false);
    setSupportOpen(false);
    setAuthOpen(false);
  };

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

    // Load from localStorage cache immediately
    const cached = localStorage.getItem("nfw_profile");
    if (cached) {
      const parsed = JSON.parse(cached);
      setProfile(parsed);
      setIsAdmin(parsed?.is_admin === true);
    }

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
              {/* About */}
              <div>
                <button
                  onClick={() => setAboutOpen(!aboutOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  About
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${aboutOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {aboutOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/about"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      About Us
                    </Link>
                  </div>
                )}
              </div>

              {/* Membership */}
              <div>
                <button
                  onClick={() => setMembershipOpen(!membershipOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Membership
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${membershipOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {membershipOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/pricing"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Membership
                    </Link>
                    <Link
                      href="/auth/sign-up"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Become a Member
                    </Link>
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Member Portal
                    </Link>
                  </div>
                )}
              </div>

              {/* Our Programs */}
              <div>
                <button
                  onClick={() => setProgramsOpen(!programsOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Our Programs
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${programsOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {programsOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/grants"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Microgrants
                    </Link>
                    <Link
                      href="/perks/info"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Perks
                    </Link>
                    <Link
                      href="/store/info"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Zero Dollar Store
                    </Link>
                    <Link
                      href="/articles"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Articles
                    </Link>
                  </div>
                )}
              </div>

              {/* Support */}
              <div>
                <button
                  onClick={() => setSupportOpen(!supportOpen)}
                  className="w-full flex items-center justify-between px-4 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                >
                  Support
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${supportOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {supportOpen && (
                  <div className="ml-4 mt-1 space-y-1">
                    <Link
                      href="/contact"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      Contact Support
                    </Link>
                    <Link href="/faq" onClick={closeMenu} className={linkClass}>
                      FAQs
                    </Link>
                  </div>
                )}
              </div>

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
                    <Link
                      href="/grants/my-applications"
                      onClick={closeMenu}
                      className={linkClass}
                    >
                      My Grants
                    </Link>
                    {isAdmin && (
                      <>
                        <div className="border-t border-white/10 my-2" />
                        <p className="px-4 py-1 text-xs font-semibold text-white/40 uppercase tracking-wider">
                          Admin
                        </p>
                        <Link
                          href="/admin/pages"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Manage Pages
                        </Link>
                        <Link
                          href="/admin/header"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Edit Header
                        </Link>
                        <Link
                          href="/admin/footer"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Edit Footer
                        </Link>
                        <Link
                          href="/admin/faq"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Edit FAQ
                        </Link>
                        <Link
                          href="/admin/contact"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Edit Contact
                        </Link>
                        <Link
                          href="/admin/grants"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Manage Grants
                        </Link>
                        <Link
                          href="/admin/articles"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Manage Articles
                        </Link>
                        <Link
                          href="/admin/members"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Manage Members
                        </Link>
                        <Link
                          href="/admin/shopify"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Manage Zero Dollar Store
                        </Link>
                        <Link
                          href="/admin/analytics"
                          onClick={closeMenu}
                          className={linkClass}
                        >
                          Analytics
                        </Link>
                      </>
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
