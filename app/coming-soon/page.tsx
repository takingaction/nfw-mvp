"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function ComingSoonPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/");
      } else {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  if (checkingAuth) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/coming-soon/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, website }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Thanks for subscribing!");
        setEmail("");
      } else {
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Connection error. Please try again.");
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/images/landing.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="absolute inset-0 z-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center justify-center flex-1 px-4 py-12">
        <img
          src="/images/nfw-symbol-brandmark-white.png"
          alt="National Fund for Women Logo"
          className="w-20 h-20 mb-8 object-contain"
        />

        <h1 className="font-serif text-white text-center text-xl md:text-2xl lg:text-3xl max-w-2xl mb-12 leading-relaxed">
          The National Fund for Women is launching soon. Add your email below to be one of the first to know when we do.
        </h1>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          <input
            type="text"
            name="website"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            className="absolute -left-[9999px]"
            aria-hidden="true"
          />

          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="enter your email"
              required
              className="flex-1 px-5 py-4 rounded-lg text-base font-ui bg-white text-black placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-nfw-wisteria"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="px-8 py-4 rounded-lg border-2 border-white text-white font-ui font-semibold text-base bg-transparent hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "..." : "Stay Tuned!"}
            </button>
          </div>

          {message && (
            <p
              className={`text-center font-ui text-sm ${
                status === "success" ? "text-green-300" : "text-red-300"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="flex items-center gap-6 mt-12">
          <a
            href="https://www.instagram.com/nationalfundforwomen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-nfw-lilac transition-colors"
            aria-label="Instagram"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
            </svg>
          </a>
          <a
            href="https://www.tiktok.com/@nationalfundforwomen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-nfw-lilac transition-colors"
            aria-label="TikTok"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z" />
            </svg>
          </a>
          <a
            href="https://www.facebook.com/nationalfundforwomen"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white hover:text-nfw-lilac transition-colors"
            aria-label="Facebook"
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
