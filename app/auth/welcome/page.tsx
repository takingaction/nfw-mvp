import Link from "next/link";
import { Check } from "lucide-react";

export default function WelcomePage() {
  return (
    <main className="min-h-screen bg-[#2d1239] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#fdf493] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#bcafcf] rounded-full opacity-5 blur-3xl"></div>
      </div>

      <div className="relative max-w-lg w-full text-center">
        {/* Checkmark */}
        <div className="w-20 h-20 bg-[#d4f1ad] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Check className="w-10 h-10 text-[#2d1239]" strokeWidth={3} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm mb-6">
          <span className="w-2 h-2 bg-[#d4f1ad] rounded-full"></span>
          <span className="text-[#fffef1] font-semibold">
            Welcome to the community
          </span>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          You&apos;re officially
          <br />
          <span className="text-[#fdf493]">a member!</span>
        </h1>

        <p className="text-[#bcafcf] text-lg mb-10 max-w-md mx-auto leading-relaxed">
          Welcome to NFW. You now have access to everything we offer —
          microgrants, perks, the Zero Dollar Store, and a community that has
          your back.
        </p>

        <div className="grid grid-cols-3 gap-4 mb-10 max-w-sm mx-auto">
          {[
            { color: "bg-[#d4f1ad]", label: "Microgrants", sub: "Apply today" },
            { color: "bg-[#fdf493]", label: "Perks", sub: "1,000+ deals" },
            { color: "bg-[#b2d1ee]", label: "Store", sub: "Free items" },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center"
            >
              <div
                className={`w-8 h-8 ${item.color} rounded-full mx-auto mb-2 flex items-center justify-center`}
              >
                <Check className="w-4 h-4 text-[#2d1239]" />
              </div>
              <p className="text-white font-bold text-sm">{item.label}</p>
              <p className="text-[#bcafcf] text-xs">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg hover:bg-[#fdf493]/90 transition-all shadow-2xl"
          >
            Go to my dashboard →
          </Link>
          <Link
            href="/grants"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
          >
            Apply for a grant
          </Link>
        </div>

        <p className="text-[#bcafcf]/50 text-xs mt-8">
          Questions?{" "}
          <a
            href="mailto:michelle@nationalfundforwomen.org"
            className="underline hover:text-[#bcafcf] transition-colors"
          >
            Contact us
          </a>
        </p>
      </div>
    </main>
  );
}
