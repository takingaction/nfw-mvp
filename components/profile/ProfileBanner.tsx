"use client";

import { Banner } from "@/components/ui/banner";
import { needsDateOfBirth } from "@/lib/profile-utils";

interface ProfileBannerProps {
  profile: {
    date_of_birth?: string | null;
  } | null;
}

export function ProfileBanner({ profile }: ProfileBannerProps) {
  if (!needsDateOfBirth(profile)) {
    return null;
  }

  const handleAction = () => {
    const pathname = window.location.pathname;
    if (pathname === "/dashboard") {
      window.location.href = "/profile";
    } else {
      const element = document.getElementById("date_of_birth");
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.focus();
      }
    }
  };

  return (
    <Banner
      message="Please add your date of birth to complete your profile. This is required for grant applications."
      actionText="Add Date of Birth"
      onAction={handleAction}
      bgColor="bg-nfw-wisteria"
    />
  );
}