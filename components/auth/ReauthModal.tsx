"use client";

import { useState, useEffect, useRef } from "react";
import OtpInput from "./OtpInput";
import { useReauthentication } from "@/lib/auth/reauthentication";

interface ReauthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  message?: string;
}

export default function ReauthModal({
  isOpen,
  onClose,
  onSuccess,
  title = "Verify Your Identity",
  message = "Enter the 8-digit code sent to your email",
}: ReauthModalProps) {
  const [otpCode, setOtpCode] = useState("");

  const {
    state,
    attemptsRemaining,
    timeUntilResend,
    error,
    startReauthentication,
    verifyOtp,
    reset,
  } = useReauthentication({
    onSuccess: () => {
      onSuccess();
      handleClose();
    },
    onError: (errMsg) => {
      console.error("Reauth error:", errMsg);
    },
  });

  useEffect(() => {
    if (isOpen && state === "idle") {
      startReauthentication();
    }
  }, [isOpen, state, startReauthentication]);

  const prevStateRef = useRef(state);
  useEffect(() => {
    prevStateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (state === "success") {
      onSuccess();
    }
  }, [state, onSuccess]);

  const handleClose = () => {
    reset();
    setOtpCode("");
    onClose();
  };

  const handleVerify = async () => {
    if (otpCode.length !== 8) {
      return;
    }
    await verifyOtp(otpCode);
  };

  const handleResend = () => {
    setOtpCode("");
    startReauthentication();
  };

  if (!isOpen) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const isLocked = state === "locked";
  const canResend = (timeUntilResend === 0 && state === "waiting") || state === "idle";
  const isVerifying = state === "verifying";
  const isSending = state === "sending";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden">
        <div className="bg-nfw-aubergine px-6 py-5 text-center">
          <h2 className="text-xl font-bold font-serif text-white">{title}</h2>
        </div>

        <div className="px-6 py-6">
          {isLocked ? (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-nfw-blackberry font-medium mb-2">Too many failed attempts</p>
              <p className="text-gray-500 text-sm">Please try again in 15 minutes or close this and try later.</p>
            </div>
          ) : (
            <>
              <p className="text-gray-600 text-center mb-6">{message}</p>

              {isSending ? (
                <div className="text-center py-8">
                  <div className="inline-block w-8 h-8 border-4 border-nfw-wisteria border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500 text-sm">Sending verification code...</p>
                </div>
              ) : (
                <>
                  <OtpInput
                    value={otpCode}
                    onChange={setOtpCode}
                    disabled={isVerifying}
                  />

                  {error && (
                    <p className="mt-3 text-red-500 text-sm text-center">{error}</p>
                  )}

                  <div className="mt-4 text-center">
                    {timeUntilResend > 0 && state === "waiting" ? (
                      <p className="text-gray-400 text-sm">
                        Resend code in: <span className="font-mono">{formatTime(timeUntilResend)}</span>
                      </p>
                    ) : canResend ? (
                      <button
                        onClick={handleResend}
                        className="text-nfw-wisteria hover:text-nfw-wisteria/80 text-sm font-medium"
                        disabled={isVerifying || isSending}
                      >
                        Resend code
                      </button>
                    ) : null}
                  </div>
                </>
              )}

              {state === "waiting" && attemptsRemaining < 3 && (
                <p className="mt-2 text-gray-400 text-xs text-center">
                  {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-nfw-dove/20 flex gap-3 justify-end">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 text-nfw-blackberry text-sm font-medium rounded hover:bg-gray-50"
          >
            Cancel
          </button>
          {!isLocked && (
            <button
              onClick={handleVerify}
              disabled={otpCode.length !== 6 || isVerifying}
              className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium rounded hover:bg-nfw-blackberry/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isVerifying ? "Verifying..." : "Verify"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}