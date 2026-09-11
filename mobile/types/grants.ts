/** Mirrors `grant_cycles` (supabase/migrations/001 + later additions). */
export interface GrantCycle {
  id: string;
  cycle_name: string;
  description: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  amount_per_grant: number;
  grants_available: number;
  status: "open" | "closed";
  is_testing_only: boolean | null;
  featured_image: string | null;
  display_order: number | null;
}

/**
 * Member-visible grant statuses. `in_review` and `payment_pending` exist in older
 * data but are hidden from members on web (Session 2026-07-13).
 */
export type GrantStatus = "submitted" | "approved" | "not_approved" | "payment_sent" | "in_review" | "payment_pending";

export const HIDDEN_GRANT_STATUSES: GrantStatus[] = ["in_review", "payment_pending"];

/** Mirrors `grants` (own rows only under RLS). */
export interface Grant {
  id: string;
  user_id: string;
  cycle_id: string;
  status: GrantStatus;
  amount_approved: number | null;
  created_at: string;
  submitted_at: string | null;
  funded_at: string | null;
  who_are_you: string;
  biggest_challenge: string;
  fund_usage: string;
  is_nominating: boolean | null;
  nominee_name: string | null;
  nominee_email: string | null;
  stripe_connect_account_id: string | null;
}

export type GrantWithCycle = Grant & {
  grant_cycles: Pick<GrantCycle, "cycle_name" | "amount_per_grant" | "end_date" | "featured_image"> | null;
};

export type GrantDetail = Grant & {
  grant_cycles: Pick<
    GrantCycle,
    "cycle_name" | "description" | "start_date" | "end_date" | "amount_per_grant" | "grants_available"
  > | null;
};

export interface GrantDocument {
  id: string;
  grant_id: string;
  file_name: string;
  file_size: number | null;
  file_type?: string | null;
  document_url: string | null;
  uploaded_at: string;
}

/** Status presentation — identical labels/colours to app/grants/my-applications/page.tsx. */
export const GRANT_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  approved: "Approved",
  not_approved: "Not Approved",
  payment_sent: "Payment Sent",
};

export const GRANT_STATUS_TONES: Record<string, "info" | "success" | "danger" | "purple" | "neutral"> = {
  submitted: "info",
  approved: "success",
  not_approved: "danger",
  payment_sent: "purple",
};

/** Dashboard uses "Paid!" for payment_sent (components/dashboard/YourMicrograntsSection.tsx). */
export const GRANT_STATUS_LABELS_DASHBOARD: Record<string, string> = {
  ...GRANT_STATUS_LABELS,
  payment_sent: "Paid!",
};
