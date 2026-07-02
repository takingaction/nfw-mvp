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
}

interface AdminSection {
  title: string;
  href?: string;
  description?: string;
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  headerBgColor: string;
  links: AdminLink[];
}

const adminSections: AdminSection[] = [
  {
    title: "Content & Website",
    icon: <FileText className="w-6 h-6" />,
    bgColor: "bg-white",
    textColor: "text-nfw-aubergine",
    headerBgColor: "bg-nfw-aubergine",
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
    icon: <Users className="w-6 h-6" />,
    bgColor: "bg-white",
    textColor: "text-nfw-aubergine",
    headerBgColor: "bg-nfw-wisteria",
    links: [
      { label: "Manage Members", href: "/admin/members" },
      { label: "Manage Grants", href: "/admin/grants" },
    ],
  },
  {
    title: "Store & Commerce",
    icon: <ShoppingCart className="w-6 h-6" />,
    bgColor: "bg-white",
    textColor: "text-nfw-aubergine",
    headerBgColor: "bg-nfw-lilac",
    links: [
      { label: "Zero Dollar Store", href: "/admin/shopify" },
      { label: "Gift Codes", href: "/admin/gift-codes" },
      { label: "NFW Perks", href: "/admin/nfw-perks" },
    ],
  },
  {
    title: "Emails & Subscriptions",
    icon: <Mail className="w-6 h-6" />,
    bgColor: "bg-white",
    textColor: "text-nfw-aubergine",
    headerBgColor: "bg-nfw-citrine",
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
  icon: <BarChart3 className="w-12 h-12" />,
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
    <div className="min-h-screen bg-nfw-dove py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-nfw-blackberry mb-2">
          Admin Dashboard
        </h1>
        <p className="font-sans text-nfw-blackberry/60 mb-8">
          Manage all aspects of your NFW membership site
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {adminSections.map((section) => (
            <div
              key={section.title}
              className={`${section.bgColor} rounded-lg overflow-hidden border border-nfw-blackberry/10`}
            >
              <div
                className={`${section.headerBgColor} ${section.title === "Emails & Subscriptions" ? "text-nfw-aubergine" : "text-white"} px-5 py-4 flex items-center gap-3`}
              >
                {section.icon}
                <h2 className="font-sans text-lg font-bold uppercase tracking-wide">
                  {section.title}
                </h2>
              </div>
              <div className="p-5">
                <div className={`grid ${getGridCols(section.links.length)} gap-3`}>
                  {section.links.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`${getLinkStyles()} px-4 py-2.5 rounded font-sans font-medium text-sm text-center transition-colors`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-lg overflow-hidden border-2 border-nfw-aubergine/30">
          <div className="bg-nfw-aubergine px-8 py-6 text-center text-white">
            <div className="flex justify-center mb-3">
              {analyticsSection.icon}
            </div>
            <h2 className="font-sans text-xl font-bold uppercase tracking-wide mb-2">
              {analyticsSection.title}
            </h2>
            <p className="font-sans text-sm text-white/80 mb-4 max-w-md mx-auto">
              {analyticsSection.description}
            </p>
            <Link
              href={analyticsSection.href!}
              className="inline-flex items-center gap-2 bg-white text-nfw-aubergine px-6 py-3 rounded font-sans font-bold text-sm uppercase tracking-wide hover:bg-nfw-citrine transition-colors"
            >
              View Analytics
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
