"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import RedeemGiftCodeModal from "@/components/gift/RedeemGiftCodeModal";
import { Gift } from "lucide-react";

interface DashboardContentProps {
  isFreeMember: boolean;
}

export default function DashboardContent({ isFreeMember }: DashboardContentProps) {
  const [showGiftModal, setShowGiftModal] = useState(false);
  const router = useRouter();

  const handleGiftSuccess = () => {
    router.refresh();
  };

  return (
    <>
      {isFreeMember && (
        <div className="bg-nfw-lilac/20 border border-nfw-lilac/30 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-nfw-wisteria/20 rounded-full flex items-center justify-center">
                <Gift className="w-5 h-5 text-nfw-wisteria" />
              </div>
              <div>
                <p className="font-semibold text-nfw-blackberry">
                  You have a gift code!
                </p>
                <p className="text-nfw-blackberry/60 text-sm">
                  Have you received a gift membership code? Redeem it now to unlock Contributing benefits.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowGiftModal(true)}
              className="px-4 py-2 bg-nfw-wisteria text-white font-semibold text-sm hover:bg-nfw-wisteria/90 transition-colors rounded-lg whitespace-nowrap"
            >
              Redeem Code
            </button>
          </div>
        </div>
      )}

      <RedeemGiftCodeModal
        isOpen={showGiftModal}
        onClose={() => setShowGiftModal(false)}
        onSuccess={handleGiftSuccess}
      />
    </>
  );
}