"use client";

import { usePathname } from "next/navigation";

interface NavigationContentProps {
  children: React.ReactNode;
}

export default function NavigationContent({ children }: NavigationContentProps) {
  // /coming-soon is no longer a gate - navigation shows on all pages
  return <>{children}</>;
}
