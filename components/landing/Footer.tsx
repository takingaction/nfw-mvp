"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";

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
  copyright_text: string;
  footer_link1_text: string;
  footer_link1_url: string;
  footer_link2_text: string;
  footer_link2_url: string;
  footer_link3_text: string;
  footer_link3_url: string;
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
  copyright_text: "© 2026 National Fund for Women. All rights reserved.",
  footer_link1_text: "Privacy Policy",
  footer_link1_url: "/privacy",
  footer_link2_text: "Terms of Use",
  footer_link2_url: "/terms",
  footer_link3_text: "Accessibility",
  footer_link3_url: "/accessibility",
};

export default function Footer() {
  const [footerData, setFooterData] = useState<FooterData | null>(null);

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

  const data = footerData ? {
    ...defaultData,
    ...footerData,
    logo_url: footerData.logo_url || defaultData.logo_url,
    column1_links: footerData.column1_links || defaultData.column1_links,
    column2_links: footerData.column2_links || defaultData.column2_links,
    column3_links: footerData.column3_links || defaultData.column3_links,
  } : defaultData;

  return (
    <footer className="bg-nfw-aubergine text-nfw-dove">
      <div className="max-w-[1400px] mx-auto px-4 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Logo Column - vertically centered */}
          <div className="md:col-span-1 flex items-center justify-center md:justify-start">
            {data.logo_url && (
              <Image
                src={data.logo_url}
                alt="NFW Logo"
                width={128}
                height={64}
                className="h-32 w-auto"
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
        </div>

        {/* Bottom Bar */}
        <div className="border-t pt-8 flex flex-col sm:flex-row justify-between items-center gap-4" style={{ borderColor: "#B7B6B9" }}>
          <p className="text-sm" style={{ color: "#B7B6B9" }}>
            {data.copyright_text}
          </p>

          <div className="flex gap-6 items-center">
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
          </div>
        </div>
      </div>
    </footer>
  );
}
