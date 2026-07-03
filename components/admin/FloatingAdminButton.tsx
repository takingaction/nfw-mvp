"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";

export default function FloatingAdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
    const cached = localStorage.getItem("nfw_profile");
    if (cached) {
      try {
        const profile = JSON.parse(cached);
        setIsAdmin(profile?.is_admin === true);
      } catch {
        setIsAdmin(false);
      }
    }
  }, []);

  const handleClick = () => {
    router.push("/admin");
  };

  if (!isMounted || !isAdmin || pathname === "/admin") {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      className="fixed top-[95px] right-4 z-40 w-10 h-10 bg-nfw-aubergine/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg hover:bg-nfw-aubergine/90 transition-all duration-200"
      aria-label="Go to Admin Dashboard"
    >
      <LayoutDashboard className="w-5 h-5 text-white" />
    </button>
  );
}
