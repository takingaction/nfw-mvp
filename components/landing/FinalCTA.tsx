"use client";

import Link from "next/link";
import { Check } from "lucide-react";

export default function FinalCTA() {
  return (
    <div className="bg-gradient-to-br from-[#2d1239] to-[#4a1f5c] py-20 lg:py-32 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 bg-[#fdf493] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-20 left-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
        {/* Headline */}
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-6 font-bold">
          Ready to feel supported?
        </h2>
        <p className="text-xl text-[#bcafcf] mb-8 max-w-2xl mx-auto">
          Join thousands of women who've already transformed their lives with
          NFW. Your journey to empowerment starts here.
        </p>

        {/* Benefits recap */}
        <div className="grid sm:grid-cols-3 gap-6 mb-10 max-w-3xl mx-auto">
          <div className="flex items-start gap-3 text-left">
            <div className="flex-shrink-0 w-6 h-6 bg-[#d4f1ad] rounded-full flex items-center justify-center mt-1">
              <Check className="w-4 h-4 text-[#2d1239]" />
            </div>
            <div>
              <div className="text-white font-bold mb-1">Microgrants</div>
              <div className="text-[#bcafcf] text-sm">
                Up to $1,000 in support
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="flex-shrink-0 w-6 h-6 bg-[#fdf493] rounded-full flex items-center justify-center mt-1">
              <Check className="w-4 h-4 text-[#2d1239]" />
            </div>
            <div>
              <div className="text-white font-bold mb-1">Exclusive Perks</div>
              <div className="text-[#bcafcf] text-sm">Save $500+ per year</div>
            </div>
          </div>
          <div className="flex items-start gap-3 text-left">
            <div className="flex-shrink-0 w-6 h-6 bg-[#b2d1ee] rounded-full flex items-center justify-center mt-1">
              <Check className="w-4 h-4 text-[#2d1239]" />
            </div>
            <div>
              <div className="text-white font-bold mb-1">Community</div>
              <div className="text-[#bcafcf] text-sm">50,000+ women strong</div>
            </div>
          </div>
        </div>

        {/* CTA Button */}
        <Link
          href="/auth/sign-up"
          className="group relative inline-flex items-center justify-center px-10 py-5 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-xl overflow-hidden transition-all shadow-2xl"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          <span className="relative">Become a Member Today</span>
        </Link>

        {/* Trust signal */}
        <p className="text-[#bcafcf] text-sm mt-6">
          Join in minutes. No credit card required to browse.
        </p>
      </div>
    </div>
  );
}
