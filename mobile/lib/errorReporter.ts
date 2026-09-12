import Constants from "expo-constants";
import { Platform } from "react-native";

import { api } from "@/lib/api";
import { supabase } from "@/lib/supabase";

/**
 * Client error reporting — mobile equivalent of POST /api/log/client-error, which forwards
 * to Slack via lib/slack-notifications.ts (notifyClientError) on the web side.
 *
 *  - Requires a session (the route 401s otherwise); unauthenticated errors are only logged.
 *  - Rate-limited and de-duplicated so a render loop can't flood Slack.
 *  - Fire-and-forget: never throws, never blocks UI.
 */
export interface ClientErrorReport {
  context: string; // e.g. "root-error-boundary", "grant-application-submit"
  message: string;
  stack?: string;
  extra?: Record<string, unknown>;
}

const MAX_PER_WINDOW = 5;
const WINDOW_MS = 60_000;
const sent: number[] = [];
const recent = new Map<string, number>();

function allowed(key: string): boolean {
  const now = Date.now();
  while (sent.length && now - sent[0] > WINDOW_MS) sent.shift();
  if (sent.length >= MAX_PER_WINDOW) return false;
  const last = recent.get(key);
  if (last && now - last < WINDOW_MS) return false;
  sent.push(now);
  recent.set(key, now);
  return true;
}

export function reportClientError(report: ClientErrorReport): void {
  const key = `${report.context}:${report.message}`;
  if (!allowed(key)) return;

  void (async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      console.warn("[errorReporter] no session; not reported:", report.context, report.message);
      return;
    }
    await api("/api/log/client-error", {
      method: "POST",
      body: {
        ...report,
        context: `mobile:${report.context}`,
        platform: `mobile-${Platform.OS}`,
        appVersion: `${Constants.expoConfig?.version ?? "unknown"}${__DEV__ ? "-dev" : ""}`,
        timestamp: new Date().toISOString(),
      },
    });
  })().catch((err) => {
    // Last resort — nowhere else to send it.
    console.warn("[errorReporter] failed to report error", err);
  });
}

export function reportError(context: string, error: unknown, extra?: Record<string, unknown>): void {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;
  reportClientError({ context, message, stack, extra });
}
