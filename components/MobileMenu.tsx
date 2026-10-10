"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useNavAuth } from "@/lib/nav-auth-store";
import { getLoginRedirectUrl } from "@/lib/redirect-utils";

interface NavLink {
  label: string;
  url: string;
  indent?: number;
}

const DEFAULT_CTA_LABEL = "Join Now";
const DEFAULT_CTA_URL = "/auth/sign-up";

function shouldIncludeNext(pathname: string): boolean {
  return pathname !== "/" && !pathname.startsWith("/auth/");
}

interface MobileMenuProps {
  navLinks?: NavLink[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

export default function MobileMenu({
  navLinks = [],
  ctaLabel,
  ctaUrl,
}: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const { status, user, fullName, isAdmin, isReviewer } = useNavAuth();
  const pathname = usePathname();

  const label = ctaLabel || DEFAULT_CTA_LABEL;
  const url = ctaUrl || DEFAULT_CTA_URL;
  const loginHref = shouldIncludeNext(pathname)
    ? getLoginRedirectUrl(pathname)
    : "/auth/login";

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
    setOpenSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    try {
      localStorage.removeItem("nfw_profile");
    } catch {
      // ignore
    }
    window.location.href = "/auth/login";
  };

  const firstLetter = fullName
    ? fullName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

  const linkClass =
    "block px-4 py-2 text-white/80 hover:bg-white/10 transition-colors";

  return (
    <>
      {/* Header bar: Log In (only when logged out) + Hamburger */}
      <div className="flex items-center gap-3">
        {status === "loading" ? (
          // Invisible twin of the logged-out state to avoid layout shift.
          <span
            className="invisible text-white font-semibold uppercase text-sm tracking-wider py-2"
            aria-hidden="true"
          >
            Log In
          </span>
        ) : status === "out" ? (
          <Link
            href={loginHref}
            className="text-white/80 font-semibold hover:text-white uppercase text-sm tracking-wider py-2"
          >
            Log In
          </Link>
        ) : null}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-white bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

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
              {/* Dynamic sections from navLinks (already filtered server-side) */}
              {sections.map(({ parent, children }) => {
                // If a parent's children all got filtered out, render the
                // parent as a plain link instead of an empty dropdown.
                if (children.length === 0) {
                  if (!parent.url) return null;
                  return (
                    <Link
                      key={parent.label}
                      href={parent.url}
                      onClick={closeMenu}
                      className="block px-4 py-3 text-white font-semibold hover:bg-white/10 transition-colors"
                    >
                      {parent.label}
                    </Link>
                  );
                }
                return (
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
                );
              })}

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
            {status === "loading" ? (
              // Match the logged-out footer width so the panel height
              // doesn't shift when the auth state resolves.
              <div className="space-y-2 invisible" aria-hidden="true">
                <div className="block w-full text-center px-4 py-2 bg-white/10 text-white font-semibold">
                  Log In
                </div>
                <div className="block w-full text-center px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-semibold">
                  {label}
                </div>
              </div>
            ) : status === "out" ? (
              <div className="space-y-2">
                <Link
                  href={loginHref}
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors"
                >
                  Log In
                </Link>
                <Link
                  href={url}
                  onClick={closeMenu}
                  className="block w-full text-center px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-semibold hover:bg-nfw-citrine/90 transition-colors"
                >
                  {label}
                </Link>
              </div>
            ) : (
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
                      {fullName || "Member"}
                    </p>
                    <p className="text-xs text-white/60">{user?.email}</p>
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
            )}
          </div>
        </div>
      </div>
    </>
  );
}
