"use client";

import { AlertTriangle } from "lucide-react";

export default function ShopifyUnavailableModal() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        <div className="px-6 pb-6 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-nfw-citrine/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-nfw-blackberry" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-nfw-aubergine mb-3">
            Store Temporarily Unavailable
          </h3>
          <p className="text-nfw-blackberry/70 mb-6">
            We&apos;re sorry, the Zero Dollar Store is temporarily unavailable. Please check back in a few minutes.
          </p>
          <p className="text-nfw-blackberry/50 text-sm mb-6">
            If you continue to experience issues, please contact support.
          </p>
          <a
            href="/"
            className="block w-full px-4 py-3 bg-nfw-aubergine text-white font-bold rounded-xl hover:bg-nfw-aubergine/90 transition-colors text-center"
          >
            Visit Homepage
          </a>
        </div>
      </div>
    </div>
  );
}
