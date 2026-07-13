"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ADMIN_STATUS_EVENT = "nfw-admin-status-change";

interface AdminStatusEvent {
  isAdmin: boolean;
}

export default function FloatingAdminButton() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  const checkAdminStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/profile");
      if (response.ok) {
        const data = await response.json();
        const adminStatus = data.is_admin === true;
        setIsAdmin(adminStatus);
        window.dispatchEvent(new CustomEvent<AdminStatusEvent>(ADMIN_STATUS_EVENT, { detail: { isAdmin: adminStatus } }));
      } else {
        setIsAdmin(false);
        window.dispatchEvent(new CustomEvent<AdminStatusEvent>(ADMIN_STATUS_EVENT, { detail: { isAdmin: false } }));
      }
    } catch {
      setIsAdmin(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();

    checkAdminStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") {
        await checkAdminStatus();
      }
    });

    const handleAdminStatusChange = (e: CustomEvent<AdminStatusEvent>) => {
      setIsAdmin(e.detail.isAdmin);
      setIsLoading(false);
    };
    window.addEventListener(ADMIN_STATUS_EVENT, handleAdminStatusChange as EventListener);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(ADMIN_STATUS_EVENT, handleAdminStatusChange as EventListener);
    };
  }, [checkAdminStatus]);

  const handleClick = () => {
    router.push("/admin");
  };

  if (isLoading || !isAdmin || pathname === "/admin") {
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
