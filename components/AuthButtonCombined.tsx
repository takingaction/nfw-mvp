"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useNavAuth } from "@/lib/nav-auth-store";
import { getLoginRedirectUrl } from "@/lib/redirect-utils";
import { LogoutButton } from "./logout-button";

const DEFAULT_CTA_LABEL = "Join Now";
const DEFAULT_CTA_URL = "/auth/sign-up";

const LINK_CLASS =
  "inline-flex items-center justify-center px-4 h-10 border border-[#ac9bb6] text-[#ac9bb6] font-bold text-sm hover:bg-[#ac9bb6]/10 transition-all";

const TEXT_LINK_CLASS =
  "text-[#ac9bb6] font-semibold hover:text-white/80 transition-colors uppercase text-sm tracking-wider py-2";

/**
 * `next` is omitted on the homepage and on /auth/* so a successful login
 * lands on /dashboard (the form's default) rather than bouncing back.
 * Keeping this exclusion list in one place so the nav and login form
 * stay aligned.
 */
function shouldIncludeNext(pathname: string): boolean {
  return pathname !== "/" && !pathname.startsWith("/auth/");
}

export function AuthButtonCombined({
  ctaLabel,
  ctaUrl,
}: {
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}) {
  const { status, user, fullName, isAdmin, isReviewer } = useNavAuth();
  const [isOpen, setIsOpen] = useState(false);

  const label = ctaLabel || DEFAULT_CTA_LABEL;
  const url = ctaUrl || DEFAULT_CTA_URL;
  const pathname = usePathname();

  const loginHref = shouldIncludeNext(pathname)
    ? getLoginRedirectUrl(pathname)
    : "/auth/login";

  // Still checking: render an invisible twin of the logged-out state so
  // the layout width doesn't shift on first paint.
  if (status === "loading") {
    return (
      <div
        className="invisible flex items-center gap-3"
        aria-hidden="true"
      >
        <span className={TEXT_LINK_CLASS}>Log In</span>
        <Link href={url} className={LINK_CLASS}>
          {label}
        </Link>
      </div>
    );
  }

  // Logged out: "Log In" text link + Join Now outline button.
  if (status === "out") {
    return (
      <div className="flex items-center gap-3">
        <Link href={loginHref} className={TEXT_LINK_CLASS}>
          Log In
        </Link>
        <Link href={url} className={LINK_CLASS}>
          {label}
        </Link>
      </div>
    );
  }

  // Logged in: avatar menu only. No Log In, no Join Now.
  const firstLetter = fullName
    ? fullName.charAt(0).toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || "U";

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
          <div className="absolute right-0 mt-2 w-56 bg-white shadow-xl border border-nfw-aubergine/10 py-2 z-20">
            <div className="px-4 py-2 border-b border-nfw-aubergine/10">
              <p className="text-sm font-semibold text-nfw-aubergine">
                {fullName || "Member"}
              </p>
              <p className="text-xs text-nfw-aubergine/50">
                {user?.email}
              </p>
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
            {isReviewer && !isAdmin && (
              <>
                <div className="border-t border-nfw-aubergine/10 mt-1" />
                <Link
                  href="/admin/grants"
                  className="block px-4 py-2 text-sm text-nfw-aubergine hover:bg-nfw-dove"
                  onClick={() => setIsOpen(false)}
                >
                  Manage Grants
                </Link>
              </>
            )}
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
