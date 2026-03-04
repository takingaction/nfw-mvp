"use client";

import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export default function Hero() {
  return (
    <div className="relative bg-[#2d1239] overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-10 w-32 h-32 bg-[#fdf493] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-40 h-40 bg-[#bcafcf] rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/3 w-24 h-24 bg-[#d4f1ad] rounded-full opacity-10 blur-2xl"></div>
      </div>

      <div className="relative max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center px-4 sm:px-6 lg:px-8 py-12">
          {/* Left Column - Text Content */}
          <div className="text-white space-y-6">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm">
              <Sparkles className="w-4 h-4 text-[#fdf493]" />
              <span className="text-[#fffef1]">
                Join thousands of members nationwide
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight font-bold">
              Feel supported.
              <br />
              <span className="text-[#fdf493]">Feel empowered.</span>
              <br />
              Feel valued.
            </h1>

            {/* Subheadline */}
            <p className="text-lg sm:text-xl text-[#bcafcf] max-w-xl">
              Join the membership community that champions American women
              through direct grants, exclusive perks, and real support.
            </p>

            {/* Benefits Checklist - TIGHTENED SPACING */}
            <div className="space-y-3 !mt-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#d4f1ad] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#2d1239]" />
                </div>
                <span className="text-[#fffef1] font-medium">
                  Apply for microgrants up to $1,000
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#fdf493] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#2d1239]" />
                </div>
                <span className="text-[#fffef1] font-medium">
                  Save hundreds with exclusive perks & discounts
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-[#b2d1ee] rounded-full flex items-center justify-center">
                  <Check className="w-4 h-4 text-[#2d1239]" />
                </div>
                <span className="text-[#fffef1] font-medium">
                  Access the Zero Dollar Store for free essentials
                </span>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth/sign-up"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg overflow-hidden transition-all shadow-lg"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Become a Member</span>
              </Link>
              <Link
                href="/about"
                className="group relative inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border-2 border-white/20 rounded-xl font-bold text-lg overflow-hidden transition-all"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
                <span className="relative">Learn More</span>
              </Link>
            </div>
          </div>

          {/* Right Column - Glass Card with Photo - CENTERED VERTICALLY */}
          <div className="relative flex items-center justify-center">
            <div className="relative w-full max-w-md mx-auto">
              {/* Large decorative gradient circle */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#bcafcf] to-[#fdf493] rounded-full opacity-30 blur-3xl"></div>

              {/* Frosted glass card - slightly rotated */}
              <div className="relative bg-white/10 backdrop-blur-md rounded-3xl p-6 lg:p-8 border-2 border-white/20 shadow-2xl transform rotate-2 hover:rotate-2 transition-all duration-500">
                {/* Photo */}
                <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[4/3]">
                  <img
                    src="/images/hero-group.webp"
                    alt="Diverse group of women supporting each other"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      e.currentTarget.parentElement!.style.background =
                        "linear-gradient(135deg, #d4f1ad 0%, #fdf493 50%, #b2d1ee 100%)";
                    }}
                  />
                </div>

                {/* Text content */}
                <div className="text-center space-y-4">
                  <h3 className="text-2xl lg:text-3xl font-black text-white font-bold leading-tight">
                    Real support.
                    <br />
                    Real results.
                  </h3>
                  <p className="text-[#bcafcf] text-base lg:text-lg leading-relaxed">
                    Join thousands of women who've already transformed their
                    lives with NFW.
                  </p>
                </div>

                {/* Decorative corner accent */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -mr-12 -mt-12"></div>
              </div>

              {/* Floating accent shapes */}
              <div className="absolute -top-8 -right-8 w-16 h-16 bg-[#d4f1ad] rounded-full opacity-60"></div>
              <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-[#fdf493] rounded-full opacity-60"></div>
              <div className="absolute top-1/2 -right-12 w-8 h-8 bg-[#bcafcf] rounded-full opacity-60"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
