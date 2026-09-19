"use client";

import { useEffect } from "react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  variant?: "success" | "error" | "info";
}

const variantStyles = {
  success: {
    icon: "✓",
    iconBg: "bg-[#d4f1ad]",
    iconColor: "text-nfw-aubergine",
    button: "bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90",
  },
  error: {
    icon: "✕",
    iconBg: "bg-red-100",
    iconColor: "text-red-700",
    button: "bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90",
  },
  info: {
    icon: "i",
    iconBg: "bg-nfw-dove",
    iconColor: "text-nfw-blackberry",
    button: "bg-nfw-aubergine text-white hover:bg-nfw-aubergine/90",
  },
} as const;

/**
 * Styled notification modal — replacement for window.alert().
 * Stays open until dismissed (no auto-close).
 *
 * Variants:
 *   - success: green check icon, aubergine OK button
 *   - error:   red X icon, aubergine OK button
 *   - info:    dove icon, aubergine OK button
 *
 * Usage:
 *   <NotificationModal
 *     isOpen={open}
 *     onClose={() => setOpen(false)}
 *     title="Success"
 *     message="Published successfully!"
 *     variant="success"
 *   />
 */
export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  variant = "info",
}: Props) {
  // Lock body scroll while modal is open.
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

  // Escape key closes the modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const style = variantStyles[variant];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-modal-title"
    >
      <div
        className="absolute inset-0 bg-nfw-blackberry/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white border border-nfw-blackberry/10 max-w-md w-full p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-nfw-blackberry/40 hover:text-nfw-blackberry"
          aria-label="Close"
        >
          ✕
        </button>
        <div className="flex items-start gap-4">
          <div
            className={`flex-shrink-0 w-10 h-10 rounded-full ${style.iconBg} ${style.iconColor} flex items-center justify-center font-bold text-lg`}
            aria-hidden="true"
          >
            {style.icon}
          </div>
          <div className="flex-1 pr-6">
            <h3
              id="notification-modal-title"
              className="text-lg font-bold text-nfw-blackberry font-serif mb-2"
            >
              {title}
            </h3>
            <p className="text-sm text-nfw-blackberry/70 font-serif">
              {message}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            type="button"
            onClick={onClose}
            className={`px-5 py-2.5 text-sm font-ui font-bold tracking-wide ${style.button}`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
