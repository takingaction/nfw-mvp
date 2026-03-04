import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">
              National Fund for Women
            </h3>
            <p className="text-sm text-gray-400">
              Empowering women through financial support, resources, and
              community.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/" className="hover:text-white">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/store" className="hover:text-white">
                  Zero Dollar Store
                </Link>
              </li>
              <li>
                <Link href="/articles" className="hover:text-white">
                  Articles
                </Link>
              </li>
              <li>
                <Link href="/microgrants" className="hover:text-white">
                  Microgrants
                </Link>
              </li>
              <li>
                <Link href="/perks" className="hover:text-white">
                  Member Perks
                </Link>
              </li>
            </ul>
          </div>

          {/* Member Resources */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase">
              Member Resources
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/profile" className="hover:text-white">
                  My Profile
                </Link>
              </li>
              <li>
                <Link href="/store/my-claims" className="hover:text-white">
                  My Claims
                </Link>
              </li>
              <li>
                <Link href="/articles" className="hover:text-white">
                  Browse Articles
                </Link>
              </li>
              <li>
                <Link
                  href="/microgrants/my-applications"
                  className="hover:text-white"
                >
                  My Applications
                </Link>
              </li>
              <li>
                <Link href="/auth/sign-up" className="hover:text-white">
                  Become a Member
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-white text-sm font-semibold mb-4 uppercase">
              Legal
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/privacy" className="hover:text-white">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-sm text-center text-gray-400">
          <p>
            &copy; {currentYear} National Fund for Women. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
