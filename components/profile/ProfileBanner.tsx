"use client";

import { useState, useEffect } from "react";
import { Banner } from "@/components/ui/banner";
import { needsDateOfBirth } from "@/lib/profile-utils";

interface ProfileBannerProps {
  profile: {
    date_of_birth?: string | null;
  } | null;
}

export function ProfileBanner({ profile }: ProfileBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem("dob-banner-dismissed") === "true";
      setDismissed(wasDismissed);
    }
  }, []);

  useEffect(() => {
    if (profile?.date_of_birth && profile.date_of_birth !== "1900-01-01") {
      localStorage.removeItem("dob-banner-dismissed");
    }
  }, [profile?.date_of_birth]);

  if (!needsDateOfBirth(profile) || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem("dob-banner-dismissed", "true");
    setDismissed(true);
  };

  const handleScrollToDOB = () => {
    const element = document.getElementById("date_of_birth");
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
      element.focus();
    }
    handleDismiss();
  };

  return (
    <Banner
      message="Please add your date of birth to complete your profile. This is required for grant applications."
      actionText="Add Date of Birth"
      onAction={handleScrollToDOB}
      onDismiss={handleDismiss}
      bgColor="bg-nfw-wisteria"
    />
  );
}
