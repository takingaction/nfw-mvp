"use client";

import Link from "next/link";
import {
  FileText,
  Users,
  ShoppingCart,
  Mail,
  BarChart3,
  ChevronRight,
} from "lucide-react";

interface AdminLink {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

interface AdminSection {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  headerBgColor: string;
  headerTextColor: string;
  links: AdminLink[];
}

const adminSections: AdminSection[] = [
  {
    title: "Content & Website",
    icon: <FileText className="w-5 h-5" />,
    bgColor: "bg-white",
    headerBgColor: "bg-nfw-aubergine",
    headerTextColor: "text-white",
    links: [
      { label: "Manage Pages", href: "/admin/pages" },
      { label: "Edit Header", href: "/admin/header" },
      { label: "Edit Footer", href: "/admin/footer" },
      { label: "Edit FAQ", href: "/admin/faq" },
      { label: "Edit Contact", href: "/admin/contact" },
      { label: "Legal Pages", href: "/admin/legal" },
      { label: "Manage Articles", href: "/admin/articles" },
      { label: "Manage Dashboard", href: "/admin/dashboard" },
      { label: "Promotional Popups", href: "/admin/promotional-popups" },
    ],
  },
  {
    title: "Members & Grants",
    icon: <Users className="w-5 h-5" />,
    bgColor: "bg-white",
    headerBgColor: "bg-nfw-wisteria",
    headerTextColor: "text-white",
    links: [
      { label: "Manage Members", href: "/admin/members" },
      { label: "Manage Grants", href: "/admin/grants" },
      { label: "Waitlist Management", href: "/admin/waitlist" },
      { label: "Incomplete Members", href: "/admin/incomplete-members" },
    ],
  },
  {
    title: "Store & Commerce",
    icon: <ShoppingCart className="w-5 h-5" />,
    bgColor: "bg-white",
    headerBgColor: "bg-nfw-lilac",
    headerTextColor: "text-nfw-aubergine",
    links: [
      { label: "Zero Dollar Store", href: "/admin/shopify" },
      { label: "Gift Codes", href: "/admin/gift-codes" },
      { label: "NFW Perks", href: "/admin/nfw-perks" },
      { label: "Perk Collections", href: "/admin/perk-collections" },
    ],
  },
  {
    title: "Emails & Subscriptions",
    icon: <Mail className="w-5 h-5" />,
    bgColor: "bg-white",
    headerBgColor: "bg-nfw-citrine",
    headerTextColor: "text-nfw-aubergine",
    links: [
      { label: "Email Templates", href: "/admin/emails" },
      { label: "Newsletter Signups", href: "/admin/newsletter-signups" },
      { label: "Contact Submissions", href: "/admin/contact-submissions" },
      { label: "Story Submissions", href: "/admin/story-submissions" },
    ],
  },
];

const analyticsSection = {
  title: "Analytics",
  description: "View member metrics, cohorts, Freshdesk tickets, and engagement data",
  icon: <BarChart3 className="w-8 h-8" />,
  href: "/admin/analytics",
};

export default function AdminHubClient() {
  const getGridCols = (linkCount: number) => {
    if (linkCount <= 2) return "grid-cols-2";
    if (linkCount <= 4) return "grid-cols-2";
    return "grid-cols-3";
  };

  const getLinkStyles = () => {
    return "bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine hover:text-white";
  };

  return (
    <div className="min-h-screen bg-nfw-dove py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-nfw-blackberry mb-2">
          Admin Dashboard
        </h1>
        <p className="font-sans text-nfw-blackberry/60 mb-6">
          Manage all aspects of your NFW membership site
        </p>

        {/* Main grid: 2 columns - left has Content, right has everything else stacked */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          {/* Left column - Content spans full height */}
          <div className="lg:col-span-3">
            <div className={`${adminSections[0].bgColor} rounded-lg overflow-hidden border border-nfw-blackberry/10`}>
              <div className={`${adminSections[0].headerBgColor} ${adminSections[0].headerTextColor} px-4 py-3 flex items-center gap-2`}>
                {adminSections[0].icon}
                <h2 className="font-sans text-sm font-bold uppercase tracking-wide">
                  {adminSections[0].title}
                </h2>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 gap-2">
                  {adminSections[0].links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${getLinkStyles()} px-3 py-2 rounded font-sans font-medium text-xs text-center transition-colors`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column - stacked sections */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Members & Grants - compact */}
            <div className={`${adminSections[1].bgColor} rounded-lg overflow-hidden border border-nfw-blackberry/10`}>
              <div className={`${adminSections[1].headerBgColor} ${adminSections[1].headerTextColor} px-4 py-2 flex items-center gap-2`}>
                {adminSections[1].icon}
                <h2 className="font-sans text-xs font-bold uppercase tracking-wide">
                  {adminSections[1].title}
                </h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  {adminSections[1].links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${getLinkStyles()} px-2 py-1.5 rounded font-sans font-medium text-xs text-center transition-colors`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Store & Commerce */}
            <div className={`${adminSections[2].bgColor} rounded-lg overflow-hidden border border-nfw-blackberry/10`}>
              <div className={`${adminSections[2].headerBgColor} ${adminSections[2].headerTextColor} px-4 py-2 flex items-center gap-2`}>
                {adminSections[2].icon}
                <h2 className="font-sans text-xs font-bold uppercase tracking-wide">
                  {adminSections[2].title}
                </h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-3 gap-2">
                  {adminSections[2].links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${getLinkStyles()} px-2 py-1.5 rounded font-sans font-medium text-xs text-center transition-colors flex items-center justify-center gap-1.5`}
                    >
                      {link.icon}
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Emails & Subscriptions */}
            <div className={`${adminSections[3].bgColor} rounded-lg overflow-hidden border border-nfw-blackberry/10`}>
              <div className={`${adminSections[3].headerBgColor} ${adminSections[3].headerTextColor} px-4 py-2 flex items-center gap-2`}>
                {adminSections[3].icon}
                <h2 className="font-sans text-xs font-bold uppercase tracking-wide">
                  {adminSections[3].title}
                </h2>
              </div>
              <div className="p-3">
                <div className="grid grid-cols-2 gap-2">
                  {adminSections[3].links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${getLinkStyles()} px-2 py-1.5 rounded font-sans font-medium text-xs text-center transition-colors`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Analytics - button only */}
            <Link
              href={analyticsSection.href}
              className="flex items-center justify-center gap-2 bg-nfw-aubergine text-white px-4 py-3 rounded-lg font-sans font-bold text-sm uppercase tracking-wide hover:bg-nfw-aubergine/90 transition-colors"
            >
              {analyticsSection.title}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
