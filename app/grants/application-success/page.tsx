import Link from "next/link";
import { Check } from "lucide-react";

export default function ApplicationSuccessPage() {
  return (
    <main className="min-h-screen bg-[#2d1239] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-64 h-64 bg-[#fdf493] rounded-full opacity-10 blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-[#d4f1ad] rounded-full opacity-10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#bcafcf] rounded-full opacity-5 blur-3xl" />
      </div>

      <div className="relative max-w-lg w-full text-center">
        {/* Checkmark */}
        <div className="w-20 h-20 bg-[#d4f1ad] rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl">
          <Check className="w-10 h-10 text-[#2d1239]" strokeWidth={3} />
        </div>

        <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#bcafcf]/20 border border-[#bcafcf]/30 rounded-full text-sm mb-6">
          <span className="w-2 h-2 bg-[#d4f1ad] rounded-full" />
          <span className="text-[#fffef1] font-semibold">
            Application received
          </span>
        </div>

        <h1
          className="text-4xl sm:text-5xl font-black text-white mb-4 leading-tight"
          style={{ fontFamily: "Montserrat, sans-serif" }}
        >
          Application
          <br />
          <span className="text-[#fdf493]">Submitted!</span>
        </h1>

        <p className="text-[#bcafcf] text-lg mb-10 max-w-md mx-auto leading-relaxed">
          Your microgrant application has been received. Our team will review it
          and notify you of the decision — usually within 48 hours.
        </p>

        {/* What happens next */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 text-left">
          <h2
            className="text-white font-black text-sm uppercase tracking-wider mb-4"
            style={{ fontFamily: "Montserrat, sans-serif" }}
          >
            What happens next
          </h2>
          <div className="space-y-3">
            {[
              { step: "01", text: "Our team reviews your application" },
              { step: "02", text: "You'll receive a decision within 48 hours" },
              {
                step: "03",
                text: "If approved, you'll connect your bank account to receive funds",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-center gap-3">
                <span className="text-xs font-black text-[#bcafcf]/50 w-6 flex-shrink-0">
                  {item.step}
                </span>
                <p className="text-[#fffef1] text-sm">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/grants/my-applications"
            className="inline-flex items-center justify-center px-8 py-4 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold text-lg hover:bg-[#fdf493]/90 transition-all shadow-2xl"
          >
            View My Applications →
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-white border border-white/20 rounded-xl font-bold text-lg hover:bg-white/20 transition-all"
          >
            Go to Dashboard
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
