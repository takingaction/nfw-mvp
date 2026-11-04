// Claim statuses a member should see on /store/my-claims and in recent claims.
// Excludes "created" (checkout started, never completed; cleared manually) and
// "rejected_invalid_user" / "rejected_monthly_limit" (rejected by the webhook).
export const VISIBLE_CLAIM_STATUSES = [
  "completed",
  "fulfilled",
  "delivered",
  "cancelled",
];
