"use client";

import Link from "next/link";

interface BannerProps {
  message: string;
  actionText: string;
  href?: string;
  onAction?: () => void;
  bgColor?: string;
}

export function Banner({ message, actionText, href, onAction, bgColor = "bg-nfw-aubergine" }: BannerProps) {
  return (
    <div className={`${bgColor} text-white px-4 py-3 sm:px-6 sm:py-4`}>
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <p className="text-sm sm:text-base font-medium flex-1">
          {message}
        </p>
        <div className="flex items-center gap-3">
          {href ? (
            <Link
              href={href}
              className="inline-flex items-center justify-center px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-bold text-sm hover:bg-nfw-citrine/90 transition-colors whitespace-nowrap"
            >
              {actionText}
            </Link>
          ) : onAction ? (
            <button
              onClick={onAction}
              className="inline-flex items-center justify-center px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-bold text-sm hover:bg-nfw-citrine/90 transition-colors whitespace-nowrap"
            >
              {actionText}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
