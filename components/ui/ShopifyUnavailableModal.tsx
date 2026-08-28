"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";

interface ShopifyUnavailableModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShopifyUnavailableModal({
  isOpen,
  onClose,
}: ShopifyUnavailableModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="flex items-center justify-end px-6 pt-4">
          <button
            onClick={onClose}
            className="p-1 text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-nfw-citrine/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-nfw-blackberry" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-nfw-aubergine mb-3">
            Store Temporarily Unavailable
          </h3>
          <p className="text-nfw-blackberry/70 mb-6">
            We&apos;re sorry, the Zero Dollar Store is temporarily unavailable. Please check back in a few minutes.
          </p>
          <p className="text-nfw-blackberry/50 text-sm mb-6">
            If you continue to experience issues, please contact support.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-nfw-aubergine text-white font-bold rounded-xl hover:bg-nfw-aubergine/90 transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
