import { Suspense } from "react";
import SignUpFlow from "@/components/SignUpFlow";

export const metadata = {
  title: "Become a Member | National Fund for Women",
  description:
    "Become a member of the National Fund for Women to access resources, perks, and programs designed to support women and strengthen communities.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpFlow />
    </Suspense>
  );
}
