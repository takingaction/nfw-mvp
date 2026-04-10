import type { Metadata } from "next";
import { Geist, Geist_Mono, Playfair_Display, DM_Sans } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/landing/Footer";
import BackToTop from "@/components/BackToTop";

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
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const pathname = headersList.get("x-pathname") || "/";
  const isPublicRoute = pathname === "/coming-soon";

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} ${dmSans.variable} antialiased`}
        suppressHydrationWarning
      >
        {!isPublicRoute && <Navigation />}
        {children}
        {!isPublicRoute && <Footer />}
        {!isPublicRoute && <BackToTop />}
      </body>
    </html>
  );
}
