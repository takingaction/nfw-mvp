"use client";

import { useState, useEffect } from "react";

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

export default function DeleteAccountModal({
  isOpen,
  onClose,
  userId,
}: DeleteAccountModalProps) {
  const [step, setStep] = useState<"confirm" | "success" | "error">("confirm");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingRequest, setHasExistingRequest] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkExistingRequest();
    }
  }, [isOpen, userId]);

  const checkExistingRequest = async () => {
    try {
      const res = await fetch("/api/profile/request-deletion");
      const data = await res.json();
      if (data.hasRequest) {
        setHasExistingRequest(true);
      }
    } catch (e) {
      // Ignore errors checking existing request
    }
  };

  const handleRequestDeletion = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/profile/request-deletion", {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to submit deletion request");
        setStep("error");
      } else {
        setStep("success");
      }
    } catch (e: any) {
      setError(e.message || "An unexpected error occurred");
      setStep("error");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-nfw-blackberry/40"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        {step === "confirm" && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-5 h-5 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-serif text-nfw-blackberry">
                Delete Your Account
              </h3>
            </div>

            {hasExistingRequest ? (
              <div className="space-y-4">
                <p className="text-nfw-blackberry/80">
                  You have already submitted a deletion request. Your account is
                  pending review by an administrator.
                </p>
                <p className="text-sm text-nfw-blackberry/50">
                  If you need to cancel your request, please contact support.
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-nfw-aubergine text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-aubergine/90 transition-colors"
                >
                  Close
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-nfw-blackberry/80">
                  Are you sure you want to delete your account? This action
                  cannot be undone.
                </p>

                <div className="bg-nfw-wisteria/10 border border-nfw-wisteria/30 rounded-lg p-4">
                  <h4 className="font-semibold text-nfw-blackberry mb-2">
                    What happens when your account is deleted:
                  </h4>
                  <ul className="text-sm text-nfw-blackberry/70 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">−</span>
                      Your personal information will be anonymized
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">−</span>
                      Your profile and social data will be removed
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">−</span>
                      Your grant applications will be anonymized
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-red-500 mt-0.5">−</span>
                      Your perk redemptions and store claims will be anonymized
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">+</span>
                      Your financial records (payments, memberships) will be
                      retained for tax purposes
                    </li>
                  </ul>
                </div>

                <div className="bg-nfw-citrine/20 border border-nfw-citrine/40 rounded-lg p-4">
                  <p className="text-sm text-nfw-blackberry/80">
                    <strong>Note:</strong> If you have an active subscription,
                    you must cancel it first before you can delete your
                    account.
                  </p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={onClose}
                    disabled={loading}
                    className="flex-1 bg-nfw-blackberry/10 text-nfw-blackberry px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-blackberry/20 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRequestDeletion}
                    disabled={loading}
                    className="flex-1 bg-red-600 text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Delete My Account"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {step === "success" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h3 className="text-xl font-serif text-nfw-blackberry mb-2">
              Request Submitted
            </h3>
            <p className="text-nfw-blackberry/70 mb-6">
              Your account deletion request has been submitted. An administrator
              will review it shortly.
            </p>
            <button
              onClick={onClose}
              className="w-full bg-nfw-aubergine text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-aubergine/90 transition-colors"
            >
              Close
            </button>
          </div>
        )}

        {step === "error" && (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h3 className="text-xl font-serif text-nfw-blackberry mb-2">
              Request Failed
            </h3>
            <p className="text-nfw-blackberry/70 mb-6">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-nfw-blackberry/10 text-nfw-blackberry px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-blackberry/20 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setStep("confirm");
                  setError(null);
                }}
                className="flex-1 bg-nfw-aubergine text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-aubergine/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
