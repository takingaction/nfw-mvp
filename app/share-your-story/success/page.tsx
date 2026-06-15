import Link from "next/link";

export default function ShareYourStorySuccessPage() {
  return (
    <main className="min-h-screen bg-nfw-dove py-12 px-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white border border-nfw-blackberry/10 p-12">
          <div className="w-16 h-16 bg-nfw-citrine flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-nfw-blackberry" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-nfw-blackberry font-serif mb-4">
            Thank you for sharing!
          </h1>
          <p className="text-nfw-blackberry/70 font-sans mb-8">
            Your story has been submitted successfully. We appreciate you taking the time to share your experience with NFW.
          </p>
          <Link
            href="/dashboard"
            className="inline-block px-6 py-3 bg-nfw-aubergine text-white font-semibold font-ui text-sm hover:bg-nfw-aubergine/90 transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}