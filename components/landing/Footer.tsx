"use client";

import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-nfw-blackberry text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 lg:gap-12 mb-12">
          {/* Brand Column */}
          <div className="md:col-span-1">
            <Image
              src="/images/footer-logo.png"
              alt="NFW Logo"
              width={128}
              height={64}
              className="h-32 w-auto mb-4"
              priority
            />
            <p className="text-nfw-lilac text-sm leading-relaxed">
              A space to celebrate, listen, and uplift American women.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-ui font-bold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  prefetch={false}
                  href="/about"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/grants"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Microgrants
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/perks/info"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Perks & Discounts
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/store/info"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Zero Dollar Store
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-ui font-bold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  prefetch={false}
                  href="/contact"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Contact Us
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/faq"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  FAQ
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/pricing"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Membership Info
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-ui font-bold mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  prefetch={false}
                  href="/privacy"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/terms"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  prefetch={false}
                  href="/accessibility"
                  className="font-ui text-nfw-lilac hover:text-white transition-colors"
                >
                  Accessibility
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-nfw-lilac text-sm">
            © {currentYear} National Fund for Women. All rights reserved.
          </p>

          <div className="flex gap-6 items-center">
            <a
              href="https://www.facebook.com/nationalfundforwomen/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Facebook"
            >
              <Image
                src="/images/social/White-Lavender-Facebook.png"
                alt="Facebook"
                width={48}
                height={48}
                className="h-12 w-12"
                loading="lazy"
              />
            </a>
            <a
              href="https://www.instagram.com/nationalfundforwomen"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="Instagram"
            >
              <Image
                src="/images/social/White-Lavender-Instagram.png"
                alt="Instagram"
                width={48}
                height={48}
                className="h-12 w-12"
                loading="lazy"
              />
            </a>
            <a
              href="https://www.tiktok.com/@nationalfundforwomen"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
              aria-label="TikTok"
            >
              <Image
                src="/images/social/White-Lavender-TikTok.png"
                alt="TikTok"
                width={48}
                height={48}
                className="h-12 w-12"
                loading="lazy"
              />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
