import { createClient } from "@supabase/supabase-js";
import NavigationClient from "./NavigationClient";
import MobileMenu from "./MobileMenu";
import { AuthButtonCombined } from "./AuthButtonCombined";
import NavigationContent from "./NavigationContent";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface NavLink {
  label: string;
  url: string;
  indent?: number;
}

interface HeaderData {
  id: string;
  logo_url: string | null;
  nav_links: NavLink[];
  cta_label: string | null;
  cta_url: string | null;
  donate_label: string | null;
  donate_url: string | null;
}

export default async function Navigation() {
  const { data: header } = await supabaseAdmin
    .from("site_header")
    .select("*")
    .limit(1)
    .single();

  const defaultHeader: HeaderData = {
    id: "",
    logo_url: "/images/header-logo.png",
    nav_links: [
      { label: "About Us", url: "/about-us", indent: 0 },
      { label: "Membership", url: "/pricing", indent: 0 },
      { label: "Membership", url: "/pricing", indent: 1 },
      { label: "Become a Member", url: "/auth/sign-up", indent: 1 },
      { label: "Member Portal", url: "/dashboard", indent: 1 },
      { label: "Our Programs", url: "/grants", indent: 0 },
      { label: "Microgrants", url: "/grants", indent: 1 },
      { label: "Perks", url: "/perks/info", indent: 1 },
      { label: "Zero Dollar Store", url: "/store/info", indent: 1 },
      { label: "Support", url: "/faq", indent: 0 },
      { label: "Contact Support", url: "/contact", indent: 1 },
      { label: "FAQs", url: "/faq", indent: 1 },
    ],
    cta_label: "Join Now",
    cta_url: "/auth/sign-up",
    donate_label: "Donate",
    donate_url: "https://www.zeffy.com/en-US/donation-form/national-fund-for-women-foundation",
  };

  const headerData: HeaderData = header || defaultHeader;

  // Convert highlight to indent for backwards compatibility with old data format
  const navLinks = (headerData.nav_links || defaultHeader.nav_links).map((l) => ({
    label: l.label,
    url: l.url,
    indent: l.indent ?? (l as any).highlight ? 1 : 0,
  }));

  return (
    <NavigationContent>
      <nav className="w-full bg-nfw-aubergine sticky top-0 z-50 shadow-md">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="flex items-center justify-between h-[90px] py-2">
            {/* Mobile: Logo left, Hamburger right */}
            <div className="flex lg:hidden items-center w-full">
              <NavigationClient
                side="left"
                logoUrl={headerData.logo_url}
                navLinks={navLinks}
              />
              <div className="ml-auto">
                <MobileMenu navLinks={navLinks} />
              </div>
            </div>

            {/* Desktop: Logo left, nav center-right */}
            <div className="hidden lg:flex w-full h-full items-center gap-8">
              {/* Left: Logo */}
              <NavigationClient
                side="left"
                logoUrl={headerData.logo_url}
                navLinks={navLinks}
              />

              {/* Right: Nav items + donate + auth button */}
              <div className="flex items-center gap-6 ml-auto">
                <NavigationClient
                  side="right"
                  logoUrl={headerData.logo_url}
                  navLinks={navLinks}
                />
                {headerData.donate_label && headerData.donate_url && (
                  <a
                    href={headerData.donate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-4 h-10 bg-nfw-citrine text-nfw-blackberry font-ui font-bold text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
                  >
                    {headerData.donate_label}
                  </a>
                )}
                <AuthButtonCombined />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </NavigationContent>
  );
}
