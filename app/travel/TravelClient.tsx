"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { Loader2, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface TravelClientProps {
  userId: string;
  userEmail?: string;
  firstName?: string;
  lastName?: string;
}

export default function TravelClient({
  userId,
  userEmail,
  firstName,
  lastName,
}: TravelClientProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const containerRef = useRef<HTMLDivElement>(null);
  const sdkLoadedRef = useRef(false);

  const handleBackToTravelHome = () => {
    window.location.reload();
  };

  const initTravel = async () => {
    try {
      const response = await fetch("/api/travel/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_key: userId,
          first_name: firstName,
          last_name: lastName,
          email: userEmail,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to get travel session");
      }

      const { session_token } = await response.json();

      if (typeof window !== "undefined" && (window as any).travelClient) {
        (window as any).travelClient.start({
          session_token,
          container: "#travel-container",
          height: "fit",
          width: "100%",
          navigate_to: { view: "home" },
        });

        setStatus("ready");
      }
    } catch (err: any) {
      console.error("Travel initialization error:", err);
      setStatus("error");
      setErrorMessage(err.message || "Failed to initialize travel booking");
    }
  };

  useEffect(() => {
    initTravel();
  }, [userId, firstName, lastName, userEmail]);

  const handleSDKLoad = () => {
    console.log("Travel SDK loaded");
  };

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-nfw-dove">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-serif text-nfw-blackberry mb-4">
            Travel Booking Unavailable
          </h1>
          <p className="text-nfw-blackberry/70 mb-6">{errorMessage}</p>
          <p className="text-sm text-nfw-blackberry/50">
            Please try again later or contact support if the problem persists.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nfw-dove">
      {/* Header - matching /perks style */}
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop: horizontal layout */}
          <div className="hidden sm:flex items-start justify-between">
            <div>
              <Link
                href="/perks"
                className="inline-flex items-center gap-2 text-nfw-aubergine hover:text-nfw-blackberry/70 transition-colors font-ui text-sm mb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Perks
              </Link>
              <h1 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-aubergine mb-2">
                Travel Benefits
              </h1>
              <p className="font-serif text-nfw-blackberry/60">
                Book hotels, cars, flights, parks, and activities
              </p>
            </div>
            <button
              onClick={handleBackToTravelHome}
              className="flex items-center gap-2 bg-nfw-aubergine text-white px-4 py-2 rounded-lg hover:bg-nfw-blackberry transition-colors font-ui text-sm"
            >
              <Home className="w-4 h-4" />
              Back to Travel Home
            </button>
          </div>

          {/* Mobile: stacked layout */}
          <div className="sm:hidden">
            <Link
              href="/perks"
              className="inline-flex items-center gap-2 text-nfw-aubergine hover:text-nfw-blackberry/70 transition-colors font-ui text-sm mb-3"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Perks
            </Link>
            <h1 className="font-serif text-3xl text-nfw-aubergine mb-1">
              Travel Benefits
            </h1>
            <p className="font-serif text-nfw-blackberry/60 text-sm">
              Book hotels, cars, flights, parks, and activities
            </p>
            <button
              onClick={handleBackToTravelHome}
              className="flex items-center gap-2 bg-nfw-aubergine text-white px-4 py-2 rounded-lg hover:bg-nfw-blackberry transition-colors font-ui text-sm mt-4 w-full justify-center"
            >
              <Home className="w-4 h-4" />
              Back to Travel Home
            </button>
          </div>
        </div>
      </div>

      {/* Loading state */}
      {status === "loading" && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-nfw-aubergine" />
          <span className="ml-3 text-nfw-blackberry font-ui">
            Loading travel booking...
          </span>
        </div>
      )}

      {/* Travel SDK container */}
      <div
        id="travel-container"
        ref={containerRef}
        className="w-full"
        style={{ minHeight: "80vh" }}
      />

      {/* Load Travel SDK script */}
      <Script
        src="https://booking.accessdevelopment-stage.com/scripts/travel.client.v2.js"
        strategy="afterInteractive"
        onLoad={handleSDKLoad}
      />
    </div>
  );
}