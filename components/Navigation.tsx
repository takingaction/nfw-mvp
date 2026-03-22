import { createClient } from "@supabase/supabase-js";
import NavigationClient from "./NavigationClient";
import MobileMenu from "./MobileMenu";
import { AuthButtonCombined } from "./AuthButtonCombined";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface NavLink {
  label: string;
  url: string;
  highlight?: boolean;
}

interface HeaderData {
  id: string;
  logo_url: string | null;
  nav_links: NavLink[];
  cta_label: string | null;
  cta_url: string | null;
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
      { label: "About", url: "/about", highlight: false },
      { label: "About Us", url: "/about", highlight: true },
      { label: "Membership", url: "/pricing", highlight: false },
      { label: "Membership", url: "/pricing", highlight: true },
      { label: "Become a Member", url: "/auth/sign-up", highlight: true },
      { label: "Member Portal", url: "/dashboard", highlight: true },
      { label: "Our Programs", url: "/grants", highlight: false },
      { label: "Microgrants", url: "/grants", highlight: true },
      { label: "Perks", url: "/perks/info", highlight: true },
      { label: "Zero Dollar Store", url: "/store/info", highlight: true },
      { label: "Support", url: "/faq", highlight: false },
      { label: "Contact Support", url: "/contact", highlight: true },
      { label: "FAQs", url: "/faq", highlight: true },
    ],
    cta_label: "Join Now",
    cta_url: "/auth/sign-up",
  };

  const headerData: HeaderData = header || defaultHeader;

  return (
    <nav className="w-full bg-nfw-aubergine sticky top-0 z-50 shadow-md">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex items-center justify-between h-[90px] py-2">
          {/* Mobile: Logo left, Hamburger right */}
          <div className="flex lg:hidden items-center w-full">
            <NavigationClient
              side="left"
              logoUrl={headerData.logo_url}
              navLinks={headerData.nav_links}
            />
            <div className="ml-auto">
              <MobileMenu />
            </div>
          </div>

          {/* Desktop: Logo left, nav center-right */}
          <div className="hidden lg:flex w-full h-full items-center gap-8">
            {/* Left: Logo */}
            <NavigationClient
              side="left"
              logoUrl={headerData.logo_url}
              navLinks={headerData.nav_links}
            />

            {/* Right: Nav items + auth button */}
            <div className="flex items-center gap-6 ml-auto">
              <NavigationClient
                side="right"
                logoUrl={headerData.logo_url}
                navLinks={headerData.nav_links}
              />
              <AuthButtonCombined />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
