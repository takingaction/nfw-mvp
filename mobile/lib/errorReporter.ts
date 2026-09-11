import Constants from "expo-constants";
import { Platform } from "react-native";

import { api } from "@/lib/api";

/**
 * Client error reporting — mobile equivalent of POST /api/log/client-error,
 * which forwards to Slack via lib/slack-notifications.ts on the web side.
 *
 * Fire-and-forget: never throws, never blocks UI.
 */
export interface ClientErrorReport {
  context: string; // e.g. "grant-application-submit"
  message: string;
  stack?: string;
  extra?: Record<string, unknown>;
}

export function reportClientError(report: ClientErrorReport): void {
  void api("/api/log/client-error", {
    method: "POST",
    body: {
      ...report,
      platform: `mobile-${Platform.OS}`,
      appVersion: Constants.expoConfig?.version ?? "unknown",
      timestamp: new Date().toISOString(),
    },
  }).catch((err) => {
    // Last resort — nowhere else to send it.
    console.warn("[errorReporter] failed to report error", err);
  });
}

export function reportError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  reportClientError({ context, message, stack, extra });
}
