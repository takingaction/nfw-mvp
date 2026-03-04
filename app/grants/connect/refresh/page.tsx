"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

function RefreshContent() {
  const searchParams = useSearchParams();
  const grantId = searchParams.get("grantId");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/connect/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    handleRefresh();
  }, []);

  return (
    <main className="min-h-screen bg-[#2d1239] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {loading ? (
          <>
            <Loader2 className="w-12 h-12 text-[#bcafcf] animate-spin mx-auto mb-4" />
            <p className="text-white font-semibold">
              Refreshing your connection link...
            </p>
          </>
        ) : error ? (
          <>
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 bg-[#fdf493] text-[#2d1239] rounded-xl font-bold"
            >
              Try Again
            </button>
          </>
        ) : null}
      </div>
    </main>
  );
}

export default function RefreshPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#2d1239]" />}>
      <RefreshContent />
    </Suspense>
  );
}
