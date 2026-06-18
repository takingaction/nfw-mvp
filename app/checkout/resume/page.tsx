"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ResumeCheckoutPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const resumeCheckout = async () => {
      try {
        const res = await fetch("/api/checkout/resume", {
          method: "POST",
        });
        const data = await res.json();

        if (data.url) {
          window.location.href = data.url;
        } else {
          setError(data.error || "Failed to resume checkout");
          setLoading(false);
        }
      } catch (err) {
        console.error("[resume] Error:", err);
        setError("Failed to resume checkout. Please try again.");
        setLoading(false);
      }
    };

    resumeCheckout();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-nfw-blackberry border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-nfw-blackberry font-serif">Preparing your checkout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md mx-4 text-center">
        <h1 className="text-2xl font-serif text-nfw-blackberry mb-4">Unable to Resume Checkout</h1>
        <p className="text-nfw-blackberry/70 mb-6">{error}</p>
        <button
          onClick={() => router.push("/membership")}
          className="bg-nfw-blackberry text-white px-6 py-2 rounded font-ui hover:bg-nfw-blackberry/90 transition-colors"
        >
          Back to Membership
        </button>
      </div>
    </div>
  );
}
