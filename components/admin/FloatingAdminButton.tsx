"use client";

import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { useNavAuth } from "@/lib/nav-auth-store";

export default function FloatingAdminButton() {
  const { isAdmin, status } = useNavAuth();
  const pathname = usePathname();
  const router = useRouter();

  const handleClick = () => {
    router.push("/admin");
  };

  // Hide until we know whether the user is admin. Showing it briefly for
  // a logged-out visitor would be embarrassing.
  if (status === "loading" || !isAdmin || pathname === "/admin") {
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
