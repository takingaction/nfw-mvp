"use client";

import { usePathname } from "next/navigation";

interface NavigationContentProps {
  children: React.ReactNode;
}

export default function NavigationContent({ children }: NavigationContentProps) {
  const pathname = usePathname();

  if (pathname === "/coming-soon") {
    return null;
  }

  return <>{children}</>;
}
