"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { usePathname } from "next/navigation";

export default function BackToTop() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  if (pathname === "/coming-soon") {
    return null;
  }

  // Show button when page is scrolled down
  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 group"
          aria-label="Back to top"
        >
          <div className="relative w-14 h-14 bg-nfw-blackberry flex items-center justify-center border-2 border-nfw-citrine shadow-xl transition-all duration-300">
            <ArrowUp className="w-6 h-6 text-nfw-citrine group-hover:text-white transition-colors" />
          </div>
        </button>
      )}
    </>
  );
}
