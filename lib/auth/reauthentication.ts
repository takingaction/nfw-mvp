"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

export type ReauthState = "idle" | "sending" | "waiting" | "verifying" | "success" | "locked";

interface UseReauthenticationOptions {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  lockoutDurationMs?: number;
  maxAttempts?: number;
  otpExpiryMs?: number;
  resendCooldownMs?: number;
}

interface UseReauthenticationReturn {
  state: ReauthState;
  attemptsRemaining: number;
  timeUntilResend: number;
  timeUntilExpiry: number;
  error: string | null;
  startReauthentication: () => Promise<void>;
  verifyOtp: (code: string) => Promise<boolean>;
  reset: () => void;
}

export function useReauthentication(options: UseReauthenticationOptions = {}): UseReauthenticationReturn {
  const {
    onSuccess,
    onError,
    lockoutDurationMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 3,
    otpExpiryMs = 10 * 60 * 1000, // 10 minutes
    resendCooldownMs = 60 * 1000, // 60 seconds
  } = options;

  const [state, setState] = useState<ReauthState>("idle");
  const [attemptsRemaining, setAttemptsRemaining] = useState(maxAttempts);
  const [timeUntilResend, setTimeUntilResend] = useState(0);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [lockoutEndTime, setLockoutEndTime] = useState<number | null>(null);

  const expiryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resendIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lockoutIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const clearAllTimers = useCallback(() => {
    if (expiryTimeoutRef.current) {
      clearTimeout(expiryTimeoutRef.current);
      expiryTimeoutRef.current = null;
    }
    if (resendIntervalRef.current) {
      clearInterval(resendIntervalRef.current);
      resendIntervalRef.current = null;
    }
    if (lockoutIntervalRef.current) {
      clearInterval(lockoutIntervalRef.current);
      lockoutIntervalRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    clearAllTimers();
    setState("idle");
    setAttemptsRemaining(maxAttempts);
    setTimeUntilResend(0);
    setTimeUntilExpiry(0);
    setError(null);
    setLockoutEndTime(null);
  }, [clearAllTimers, maxAttempts]);

  const startReauthentication = useCallback(async () => {
    console.log("[Reauth] startReauthentication called, state:", state);
    console.log("[Reauth] lockoutEndTime:", lockoutEndTime);
    console.log("[Reauth] current time:", Date.now());

    if (state === "locked") {
      const remaining = lockoutEndTime ? lockoutEndTime - Date.now() : 0;
      console.log("[Reauth] Currently locked, remaining:", remaining);
      if (remaining > 0) {
        setError("Too many failed attempts. Please try again later.");
        return;
      }
      reset();
    }

    setState("sending");
    console.log("[Reauth] State set to sending");
    setError(null);

    // Set a timeout to handle cases where reauthenticate hangs
    const timeoutId = setTimeout(() => {
      console.log("[Reauth] TIMEOUT - reauthenticate took too long");
      setState("idle");
      setError("Request timed out. Please try again.");
    }, 15000); // 15 second timeout

    try {
      console.log("[Reauth] Creating Supabase client...");
      const supabase = createClient();
      console.log("[Reauth] Client created, calling reauthenticate...");
      const { data, error: reauthError } = await supabase.auth.reauthenticate();
      console.log("[Reauth] Result - data:", data, "error:", reauthError);

      clearTimeout(timeoutId);

      if (reauthError) {
        console.error("[Reauth] Error from reauthenticate:", reauthError);
        setState("idle");
        setError(reauthError.message);
        onError?.(reauthError.message);
        return;
      }

      console.log("[Reauth] Success! Setting state to waiting");
      setState("waiting");
      setTimeUntilResend(resendCooldownMs / 1000);
      setTimeUntilExpiry(otpExpiryMs / 1000);
      setAttemptsRemaining(maxAttempts);

      // Start resend cooldown timer
      resendIntervalRef.current = setInterval(() => {
        setTimeUntilResend((prev) => {
          if (prev <= 1) {
            clearInterval(resendIntervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Start expiry countdown
      expiryTimeoutRef.current = setTimeout(() => {
        setState("idle");
        setError("Verification code expired. Please request a new one.");
      }, otpExpiryMs);

    } catch (err) {
      console.error("[Reauth] Catch block error:", err);
      setState("idle");
      const message = err instanceof Error ? err.message : "Failed to send verification code";
      console.log("[Reauth] Setting error message:", message);
      setError(message);
      onError?.(message);
    }
  }, [state, lockoutEndTime, reset, resendCooldownMs, otpExpiryMs, maxAttempts, onError]);

  const verifyOtp = useCallback(async (code: string): Promise<boolean> => {
    console.log("[Reauth] verifyOtp called, code length:", code.length, "state:", state);
    if (state !== "waiting") {
      setError("Please request a verification code first");
      return false;
    }

    setState("verifying");
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user }, error: verifyError } = await supabase.auth.getUser();

      if (verifyError || !user) {
        setState("waiting");
        setError("Session expired. Please sign in again.");
        onError?.("Session expired");
        return false;
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        email: user.email!,
        token: code,
        type: "email",
      });

      if (otpError) {
        const newAttemptsRemaining = attemptsRemaining - 1;
        setAttemptsRemaining(newAttemptsRemaining);
        clearAllTimers();

        if (newAttemptsRemaining <= 0) {
          const lockoutEnd = Date.now() + lockoutDurationMs;
          setLockoutEndTime(lockoutEnd);
          setState("locked");
          setError("Too many failed attempts. Please try again later.");
          onError?.("Too many failed attempts");

          lockoutIntervalRef.current = setInterval(() => {
            if (Date.now() >= lockoutEnd) {
              reset();
            }
          }, 1000);

          return false;
        }

        setState("waiting");
        setError(`Invalid code. ${newAttemptsRemaining} attempt${newAttemptsRemaining !== 1 ? "s" : ""} remaining.`);
        onError?.(`Invalid code. ${newAttemptsRemaining} attempts remaining`);
        return false;
      }

      clearAllTimers();
      setState("success");
      onSuccess?.();
      return true;

    } catch (err) {
      setState("waiting");
      const message = err instanceof Error ? err.message : "Verification failed";
      setError(message);
      onError?.(message);
      return false;
    }
  }, [state, attemptsRemaining, clearAllTimers, lockoutDurationMs, onSuccess, onError]);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  return {
    state,
    attemptsRemaining,
    timeUntilResend,
    timeUntilExpiry,
    error,
    startReauthentication,
    verifyOtp,
    reset,
  };
}