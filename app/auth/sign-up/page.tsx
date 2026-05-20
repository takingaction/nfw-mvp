import { Suspense } from "react";
import SignUpFlow from "@/components/SignUpFlow";

export const metadata = {
  title: "Become a Member | National Fund for Women",
  description:
    "Become a member and access a trusted nationwide women's community offering practical support, empowering resources, and exclusive benefits.",
};

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <SignUpFlow />
    </Suspense>
  );
}