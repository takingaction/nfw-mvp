"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";

interface NavLink {
  label: string;
  url: string;
  highlight?: boolean;
}

interface NavigationClientProps {
  side: "left" | "right" | "center";
  logoUrl?: string | null;
  navLinks?: NavLink[];
  ctaLabel?: string | null;
  ctaUrl?: string | null;
}

const dropdownClass =
  "w-48 bg-[#3e155f] rounded-lg shadow-xl py-2 border border-white/10";
const linkClass =
  "block px-4 py-2 text-white hover:bg-white/10 transition-colors";
const buttonClass =
  "flex items-center gap-1 text-white font-semibold hover:text-white/80 transition-colors py-6 uppercase text-sm tracking-wider";

export default function NavigationClient({
  side,
  logoUrl,
  navLinks = [],
}: NavigationClientProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const renderDropdown = (label: string, items: NavLink[]) => (
    <div className="relative">
      <button
        onMouseEnter={() => setOpenDropdown(label)}
        onMouseLeave={() => setOpenDropdown(null)}
        className={buttonClass}
      >
        {label}
        <ChevronDown className="w-4 h-4" />
      </button>
      {openDropdown === label && (
        <div
          onMouseEnter={() => setOpenDropdown(label)}
          onMouseLeave={() => setOpenDropdown(null)}
          className="absolute top-full left-0 pt-0"
        >
          <div className={dropdownClass}>
            {items.map((item, idx) => (
              <Link
                key={idx}
                href={item.url}
                prefetch={false}
                className={linkClass}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  if (side === "center") {
    return (
      <Link href="/" className="inline-block flex-shrink-0">
        <Image
          src={logoUrl || "/images/header-logo.png"}
          alt="NFW Logo"
          width={180}
          height={72}
          className="h-[72px] w-auto"
          priority
        />
      </Link>
    );
  }

  if (side === "left") {
    return (
      <Link href="/" className="inline-block flex-shrink-0">
        <Image
          src={logoUrl || "/images/header-logo.png"}
          alt="NFW Logo"
          width={180}
          height={72}
          className="h-[72px] w-auto"
          priority
        />
      </Link>
    );
  }

  if (side === "right") {
    const items: React.ReactNode[] = [];
    let i = 0;

    while (i < navLinks.length) {
      const link = navLinks[i];

      if (!link.highlight) {
        const dropdownItems: NavLink[] = [];
        let j = i + 1;
        while (j < navLinks.length && navLinks[j].highlight) {
          dropdownItems.push(navLinks[j]);
          j++;
        }

        if (dropdownItems.length > 0) {
          items.push(
            <React.Fragment key={link.label}>
              <Link href={link.url} className={buttonClass}>
                {link.label}
              </Link>
              {renderDropdown(link.label, dropdownItems)}
            </React.Fragment>
          );
          i = j;
        } else {
          items.push(
            <Link key={i} href={link.url} className={buttonClass}>
              {link.label}
            </Link>
          );
          i++;
        }
      } else {
        i++;
      }
    }

    return <div className="flex items-center gap-6">{items}</div>;
  }

  return null;
}