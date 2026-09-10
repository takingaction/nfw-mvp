"use client";

import { useState } from "react";
import { createClient as createServerClient } from "@/lib/supabase/server";

export default function TestSlackPage() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const sendTestNotification = async () => {
    setLoading(true);
    setStatus("Sending...");

    try {
      const response = await fetch("/api/log/client-error", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: "test-user-123",
          userEmail: "test@nationalfundforwomen.org",
          cycleId: "test-cycle-456",
          cycleName: "Test Grant Cycle - September 2026",
          errorMessage: "This is a test error notification",
          errorCode: "TEST_001",
          stack: "Error: This is a test stack trace\n    at TestFunction (test.ts:1:1)\n    at main (index.ts:2:1)",
          timestamp: new Date().toISOString(),
        }),
      });

      if (response.ok) {
        setStatus("✅ Test notification sent! Check Slack.");
      } else {
        const data = await response.json();
        setStatus(`❌ Failed: ${data.error || response.statusText}`);
      }
    } catch (err) {
      setStatus(`❌ Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nfw-dove py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-serif text-nfw-aubergine mb-8">
          Test Slack Notifications
        </h1>

        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-serif text-nfw-blackberry mb-4">
            Grant Application Error Notification
          </h2>

          <p className="text-sm font-serif text-nfw-blackberry/70 mb-6">
            Click the button below to send a test notification to Slack. This will send a sample
            grant application error notification using the existing Slack webhook.
          </p>

          <button
            onClick={sendTestNotification}
            disabled={loading}
            className="bg-nfw-aubergine text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-aubergine/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Sending..." : "Send Test Notification"}
          </button>

          {status && (
            <div className="mt-6 p-4 bg-nfw-dove rounded-lg">
              <p className="text-sm font-ui text-nfw-blackberry">{status}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
