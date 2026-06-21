"use client";

import Link from "next/link";

interface AdminLink {
  label: string;
  href: string;
}

interface AdminSection {
  title: string;
  links: AdminLink[];
}

const adminSections: AdminSection[] = [
  {
    title: "Content & Website",
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
    links: [
      { label: "Manage Members", href: "/admin/members" },
      { label: "Manage Grants", href: "/admin/grants" },
    ],
  },
  {
    title: "Store & Commerce",
    links: [
      { label: "Manage Zero Dollar Store", href: "/admin/shopify" },
      { label: "Gift Codes", href: "/admin/gift-codes" },
      { label: "NFW Perks", href: "/admin/nfw-perks" },
    ],
  },
  {
    title: "Emails & Subscriptions",
    links: [
      { label: "Email Templates", href: "/admin/emails" },
      { label: "Newsletter Signups", href: "/admin/newsletter-signups" },
      { label: "Contact Submissions", href: "/admin/contact-submissions" },
      { label: "Story Submissions", href: "/admin/story-submissions" },
    ],
  },
  {
    title: "Analytics",
    links: [
      { label: "Analytics", href: "/admin/analytics" },
    ],
  },
];

export default function AdminHubClient() {
  return (
    <div className="min-h-screen bg-nfw-dove py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="font-serif text-3xl font-bold text-nfw-blackberry mb-2">
          Admin Dashboard
        </h1>
        <p className="font-sans text-nfw-blackberry/60 mb-8">
          Manage all aspects of your NFW membership site
        </p>

        <div className="space-y-10">
          {adminSections.map((section) => (
            <div key={section.title}>
              <h2 className="font-sans text-lg font-bold text-nfw-aubergine mb-4 uppercase tracking-wide">
                {section.title}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {section.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="bg-nfw-aubergine text-white px-4 py-3 font-sans font-medium text-sm hover:bg-nfw-blackberry transition-colors text-center"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
