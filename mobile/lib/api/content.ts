import { useMutation, useQuery } from "@tanstack/react-query";

import { apiGet, apiPost } from "@/lib/api";
import type { ContactSubmitBody, SiteContact, SiteFaq, TestimonialBody } from "@/types/content";

/** Admin-editable site content + the misc submission endpoints. */

const CONTENT_STALE = 10 * 60 * 1000;

export function useContactContent() {
  return useQuery({
    queryKey: ["content", "contact"] as const,
    staleTime: CONTENT_STALE,
    queryFn: () => apiGet<SiteContact | null>("/api/contact", { anonymous: true }),
  });
}

export function useFaqContent() {
  return useQuery({
    queryKey: ["content", "faq"] as const,
    staleTime: CONTENT_STALE,
    queryFn: () => apiGet<SiteFaq | null>("/api/faq", { anonymous: true }),
  });
}

/**
 * POST /api/contact/submit — session optional (user_id attached when present); the
 * `website` honeypot must stay empty. Note the server swallows internal errors and still
 * returns `{ success: true }`, so a 2xx does not strictly prove a Freshdesk ticket exists.
 */
export function useSubmitContact() {
  return useMutation({
    mutationFn: (body: ContactSubmitBody) =>
      apiPost<{ success: true }>("/api/contact/submit", { ...body, website: "" }),
  });
}

/** POST /api/testimonials — session required. */
export function useSubmitStory() {
  return useMutation({
    mutationFn: (body: TestimonialBody) => apiPost<{ success: true }>("/api/testimonials", body as unknown as Record<string, unknown>),
  });
}
