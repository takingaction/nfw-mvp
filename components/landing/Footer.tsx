"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

interface FooterLink {
  label: string;
  url: string;
}

interface FooterData {
  id: string;
  logo_url: string | null;
  column1_heading: string;
  column1_links: FooterLink[];
  column2_heading: string;
  column2_links: FooterLink[];
  column3_heading: string;
  column3_links: FooterLink[];
  column4_heading: string;
  column4_links: FooterLink[];
  copyright_text: string;
  footer_link1_text: string;
  footer_link1_url: string;
  footer_link2_text: string;
  footer_link2_url: string;
  footer_link3_text: string;
  footer_link3_url: string;
  social_instagram: string;
  social_tiktok: string;
  social_facebook: string;
}

const defaultData: FooterData = {
  id: "",
  logo_url: "/images/footer-logo.png",
  column1_heading: "MEMBERSHIP",
  column1_links: [
    { label: "Become a Member", url: "/auth/sign-up" },
    { label: "Perks & Discounts", url: "/perks/info" },
    { label: "Microgrants", url: "/grants" },
    { label: "Zero Dollar Store", url: "/store" },
  ],
  column2_heading: "COMMUNITY",
  column2_links: [
    { label: "Become a Member", url: "/auth/sign-up" },
    { label: "Perks & Discounts", url: "/perks/info" },
    { label: "Microgrants", url: "/grants" },
    { label: "Zero Dollar Store", url: "/store" },
  ],
  column3_heading: "ORGANIZATION",
  column3_links: [
    { label: "Become a Member", url: "/auth/sign-up" },
    { label: "Perks & Discounts", url: "/perks/info" },
    { label: "Microgrants", url: "/grants" },
    { label: "Zero Dollar Store", url: "/store" },
  ],
  column4_heading: "CONNECT",
  column4_links: [
    { label: "Instagram", url: "https://www.instagram.com/nationalfundforwomen" },
    { label: "TikTok", url: "https://www.tiktok.com/@nationalfundforwomen" },
    { label: "Facebook", url: "https://www.facebook.com/nationalfundforwomen" },
  ],
  copyright_text: "© 2026 National Fund for Women. All rights reserved.",
  footer_link1_text: "Privacy Policy",
  footer_link1_url: "/privacy",
  footer_link2_text: "Terms of Use",
  footer_link2_url: "/terms",
  footer_link3_text: "Accessibility",
  footer_link3_url: "/accessibility",
  social_instagram: "https://www.instagram.com/nationalfundforwomen",
  social_tiktok: "https://www.tiktok.com/@nationalfundforwomen",
  social_facebook: "https://www.facebook.com/nationalfundforwomen",
};

export default function Footer() {
  const pathname = usePathname();
  const [footerData, setFooterData] = useState<FooterData | null>(null);
  const [email, setEmail] = useState("");
  const [signupStatus, setSignupStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    fetch("/api/footer")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setFooterData(data);
        }
      })
      .catch(console.error);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/coming-soon/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "footer" }),
      });
      const data = await res.json();

      if (data.success) {
        setSignupStatus("success");
        setEmail("");
      } else {
        setSignupStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setSignupStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  };

  const data = footerData ? {
    ...defaultData,
    ...footerData,
    logo_url: footerData.logo_url || defaultData.logo_url,
    column1_links: footerData.column1_links || defaultData.column1_links,
    column2_links: footerData.column2_links || defaultData.column2_links,
    column3_links: footerData.column3_links || defaultData.column3_links,
    column4_links: footerData.column4_links || defaultData.column4_links,
  } : defaultData;

  if (pathname === "/coming-soon") {
    return null;
  }

  return (
    <footer className="bg-nfw-aubergine text-nfw-dove">
      <div className="max-w-[1400px] mx-auto px-4 py-8 lg:py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 lg:gap-6 mb-8">
          {/* Logo Column - vertically centered */}
          <div className="md:col-span-1 flex items-center justify-center md:justify-start md:pr-8">
            {data.logo_url && (
              <Image
                src={data.logo_url}
                alt="NFW Logo"
                width={240}
                height={120}
                className="h-auto w-full max-w-[240px]"
                priority
              />
            )}
          </div>

          {/* Column 1 - Membership */}
          <div>
            <h4 className="font-ui mb-6" style={{ color: "#B7B6B9", fontWeight: 900 }}>{data.column1_heading}</h4>
            <ul className="space-y-4 text-sm">
              {data.column1_links.map((link, i) => (
                <li key={i}>
                  <Link
                    prefetch={false}
                    href={link.url}
                    className="hover:opacity-80 transition-colors"
                    style={{ color: "#B7B6B9" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 - Community */}
          <div>
            <h4 className="font-ui mb-6" style={{ color: "#B7B6B9", fontWeight: 900 }}>{data.column2_heading}</h4>
            <ul className="space-y-4 text-sm">
              {data.column2_links.map((link, i) => (
                <li key={i}>
                  <Link
                    prefetch={false}
                    href={link.url}
                    className="hover:opacity-80 transition-colors"
                    style={{ color: "#B7B6B9" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 - Organization */}
          <div>
            <h4 className="font-ui mb-6" style={{ color: "#B7B6B9", fontWeight: 900 }}>{data.column3_heading}</h4>
            <ul className="space-y-4 text-sm">
              {data.column3_links.map((link, i) => (
                <li key={i}>
                  <Link
                    prefetch={false}
                    href={link.url}
                    className="hover:opacity-80 transition-colors"
                    style={{ color: "#B7B6B9" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 - Connect */}
          <div>
            <h4 className="font-ui mb-6" style={{ color: "#B7B6B9", fontWeight: 900 }}>{data.column4_heading}</h4>
            <ul className="space-y-4 text-sm">
              {data.column4_links.map((link, i) => (
                <li key={i}>
                  <Link
                    prefetch={false}
                    href={link.url}
                    className="hover:opacity-80 transition-colors"
                    style={{ color: "#B7B6B9" }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

{/* Email Signup Section */}
        <div className="mb-6 flex justify-end">
          <div className="flex flex-col items-start">
            <p className="font-ui mb-2 uppercase" style={{ color: "#B7B6B9", fontWeight: 900 }}>
              Sign Up for Updates
            </p>
            <form onSubmit={handleSignup} className="flex flex-col sm:flex-row items-start gap-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="w-48 px-2 py-2 bg-transparent border-b text-nfw-dove placeholder-nfw-dove/50 focus:outline-none font-ui text-sm"
                style={{ color: "#B7B6B9", borderBottomColor: "#B7B6B9" }}
              />
              {/* Honeypot field - hidden from real users */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                className="absolute -left-[9999px]"
              />
              <button
                type="submit"
                disabled={signupStatus === "loading" || signupStatus === "success"}
                className="px-4 py-2 bg-nfw-dove text-nfw-aubergine font-ui text-sm font-black uppercase tracking-[0.06em] hover:bg-white disabled:opacity-60 whitespace-nowrap"
              >
                {signupStatus === "loading" ? "Signing up..." : signupStatus === "success" ? "Signed up!" : "Submit"}
              </button>
            </form>
          </div>
          {signupStatus === "success" && (
            <p className="mt-2 font-ui text-sm" style={{ color: "#B7B6B9" }}>
              Thanks! You&apos;re on the list.
            </p>
          )}
          {signupStatus === "error" && (
            <p className="mt-2 font-ui text-sm text-red-300">
              {errorMessage}
            </p>
          )}
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-4 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: "#B7B6B9" }}>
          <p className="text-sm" style={{ color: "#B7B6B9" }}>
            {data.copyright_text}
          </p>

          <div className="flex gap-4 items-center">
            <div className="flex items-center gap-3">
              <a href={data.social_instagram} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: "#B693C0" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
              <a href={data.social_tiktok} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: "#B693C0" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-5.2 1.74 2.89 2.89 0 012.31-4.64 2.93 2.93 0 01.88.13V9.4a6.84 6.84 0 00-1-.05A6.33 6.33 0 005 20.1a6.34 6.34 0 0010.86-4.43v-7a8.16 8.16 0 004.77 1.52v-3.4a4.85 4.85 0 01-1-.1z"/>
                </svg>
              </a>
              <a href={data.social_facebook} target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity" style={{ color: "#B693C0" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
            </div>
            <span style={{ color: "#B7B6B9" }}>|</span>
            <Link
              prefetch={false}
              href={data.footer_link1_url}
              className="hover:opacity-80 transition-colors text-sm"
              style={{ color: "#B7B6B9" }}
            >
              {data.footer_link1_text}
            </Link>
            <Link
              prefetch={false}
              href={data.footer_link2_url}
              className="hover:opacity-80 transition-colors text-sm"
              style={{ color: "#B7B6B9" }}
            >
              {data.footer_link2_text}
            </Link>
            <Link
              prefetch={false}
              href={data.footer_link3_url}
              className="hover:opacity-80 transition-colors text-sm"
              style={{ color: "#B7B6B9" }}
            >
              {data.footer_link3_text}
            </Link>
            <a
              href="#"
              className="termly-display-preferences hover:opacity-80 transition-colors text-sm"
              style={{ color: "#B7B6B9" }}
            >
              Consent Preferences
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
