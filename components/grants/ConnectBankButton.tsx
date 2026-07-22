"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function ConnectBankButton({ grantId }: { grantId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConnect = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/stripe/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to start bank connection");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleConnect}
        disabled={loading}
        className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-lilac text-white font-ui hover:bg-nfw-lilac/90 disabled:opacity-50 transition-all whitespace-nowrap"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Connecting..." : "Connect Bank Account →"}
      </button>
      {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}
