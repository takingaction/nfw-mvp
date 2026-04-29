"use client";

import { useState, useEffect, useRef } from "react";
import Script from "next/script";
import { Loader2 } from "lucide-react";

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

  useEffect(() => {
    if (!userId) return;

    const initTravel = async () => {
      try {
        // Fetch session token from our backend
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

        // Wait for SDK to be loaded and travelClient to be available
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
      {/* Header */}
      <div className="bg-nfw-aubergine py-8 px-4">
        <h1 className="text-3xl font-serif text-white text-center">
          Travel Benefits
        </h1>
        <p className="text-nfw-lilac text-center mt-2 font-ui">
          Book hotels, cars, flights, parks, and activities
        </p>
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
        strategy="lazyOnload"
        onLoad={handleSDKLoad}
      />
    </div>
  );
}