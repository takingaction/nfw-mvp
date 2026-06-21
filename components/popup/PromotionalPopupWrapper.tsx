"use client";

import { usePathname } from "next/navigation";
import PromotionalPopup from "./PromotionalPopup";

export default function PromotionalPopupWrapper() {
  const pathname = usePathname();
  return <PromotionalPopup path={pathname} />;
}
