import Link from "next/link";
import { Check } from "lucide-react";

export default function ApplicationSuccessPage() {
  return (
    <main className="min-h-screen bg-nfw-aubergine flex items-center justify-center px-4">
      <div className="max-w-lg w-full text-center">
        {/* Checkmark */}
        <div className="w-20 h-20 bg-[#d4f1ad] flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-nfw-blackberry" strokeWidth={3} />
        </div>

        <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-dove mb-6">
          Application received
        </p>

        <h1 className="font-serif text-4xl lg:text-6xl text-nfw-dove mb-4 leading-tight">
          Application Submitted!
        </h1>

        <p className="font-serif text-lg text-nfw-lilac mb-10 max-w-md mx-auto leading-relaxed">
          Your microgrant application has been received. Our team will review it
          and notify you of the decision — usually within 48 hours.
        </p>

        {/* What happens next */}
        <div className="border border-white/10 p-6 mb-8 text-left">
          <h2 className="font-ui text-sm font-black tracking-[0.06em] uppercase text-nfw-dove mb-4">
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
                <span className="font-ui text-xs font-black text-nfw-lilac/50 w-6 flex-shrink-0">
                  {item.step}
                </span>
                <p className="font-serif text-sm text-nfw-dove">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/grants/my-applications"
            className="inline-flex items-center justify-center px-8 py-4 bg-nfw-citrine text-nfw-blackberry font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-nfw-citrine/90 transition-colors"
          >
            View My Applications
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-8 py-4 bg-white/10 text-nfw-dove border border-white/20 font-ui font-black text-sm tracking-[0.06em] uppercase hover:bg-white/20 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>

        <p className="font-ui text-xs text-nfw-lilac/50 mt-8">
          Questions? 
          <a
            href="mailto:michelle@nationalfundforwomen.org"
            className="underline hover:text-nfw-lilac transition-colors"
          >
            Contact us
          </a>
        </p>
      </div>
    </main>
  );
}
