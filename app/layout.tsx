import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { getCachedGtmId } from "@/lib/cms-cache";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/landing/Footer";
import BackToTop from "@/components/BackToTop";
import TermlyCMP from "@/components/TermlyCMP";
import { TERMLY_SCRIPT_SRC } from "@/lib/termly";
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
    icon: [{ url: "/icon.png?v=2", type: "image/png" }],
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

  // Cached (lib/cms-cache.ts); a lookup failure just skips GTM, as before.
  const gtmId = await getCachedGtmId().catch(() => null);

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Termly first, with Auto Blocker on, so it can hold back other
            scripts until the visitor consents. Next places beforeInteractive
            scripts in <head> ahead of its own code. GTM's <noscript> iframe is
            deliberately not used: with scripts off, Termly could not block it. */}
        <Script id="termly-resource-blocker" src={TERMLY_SCRIPT_SRC} strategy="beforeInteractive" />
        {!isPublicRoute && <Navigation />}
        {!isPublicRoute && <ViewingAsMemberBanner initialPage={pathname} />}
        <FloatingAdminButton />
        <TermlyCMP />
        <PromotionalPopupWrapper />
        {children}
        {!isPublicRoute && <Footer />}
        {!isPublicRoute && <BackToTop />}
        {gtmId && (
          <Script id="gtm" strategy="afterInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');`}
          </Script>
        )}
      </body>
    </html>
  );
}
