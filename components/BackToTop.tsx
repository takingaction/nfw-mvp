"use client";

import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

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
          {/* Outer glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#fdf493] to-[#d4f1ad] rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity"></div>

          {/* Button */}
          <div className="relative w-14 h-14 bg-[#2d1239] rounded-full flex items-center justify-center border-2 border-[#fdf493] shadow-xl group-hover:scale-110 transition-all duration-300">
            <ArrowUp className="w-6 h-6 text-[#fdf493] group-hover:text-white transition-colors" />
          </div>
        </button>
      )}
    </>
  );
}
