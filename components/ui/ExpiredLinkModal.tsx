"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ExpiredLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ExpiredLinkModal({
  isOpen,
  onClose,
}: ExpiredLinkModalProps) {
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
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 pb-6">
          <h3 className="text-xl font-bold text-nfw-aubergine mb-3">
            Link Expired
          </h3>
          <p className="text-nfw-blackberry/70 mb-6">
            If the offer is still valid, simply click the <strong>Details</strong> button 
            and redeem the offer again to generate a new link.
          </p>
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-nfw-aubergine text-white font-bold rounded-xl hover:bg-nfw-aubergine/90 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}