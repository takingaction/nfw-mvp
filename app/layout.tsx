import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { createClient } from "@supabase/supabase-js";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/landing/Footer";
import BackToTop from "@/components/BackToTop";
import TermlyCMP from "@/components/TermlyCMP";
import PromotionalPopupWrapper from "@/components/popup/PromotionalPopupWrapper";
import FloatingAdminButton from "@/components/admin/FloatingAdminButton";
import ViewingAsMemberBanner from "@/components/admin/ViewingAsMemberBanner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "National Fund for Women",
  description:
    "Empowering women through financial support, resources, and community",
  icons: {
    icon: [
      { url: "/icon.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2", type: "image/x-icon" },
    ],
  },
  openGraph: {
    title: "National Fund for Women",
    description: "Empowering women through financial support, resources, and community",
    images: ["/images/featured.jpg"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "National Fund for Women",
    description: "Empowering women through financial support, resources, and community",
    images: ["/images/featured.jpg"],
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";
  const isPublicRoute = false; // /coming-soon is no longer a gate - homepage serves to all

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: siteSettings } = await supabaseAdmin
    .from("site_settings")
    .select("gtm_id")
    .eq("id", "00000000-0000-0000-0000-000000000001")
    .maybeSingle();
  const gtmId = siteSettings?.gtm_id?.trim() || null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        {gtmId && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        )}
        {!isPublicRoute && <Navigation />}
        {!isPublicRoute && <ViewingAsMemberBanner initialPage={pathname} />}
        <FloatingAdminButton />
        <TermlyCMP />
        <PromotionalPopupWrapper />
        {children}
        {!isPublicRoute && <Footer />}
        {!isPublicRoute && <BackToTop />}
        <Script
          src="https://connect.facebook.net/en_US/fbevents.js"
          strategy="afterInteractive"
        />
        <Script id="meta-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '1265927739923182');
            fbq('track', 'PageView');
          `}
        </Script>
        {gtmId && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
        <noscript>
          <img height="1" width="1" style={{display: "none"}}
            src="https://www.facebook.com/tr?id=1265927739923182&ev=PageView&noscript=1"
          />
        </noscript>
      </body>
    </html>
  );
}
