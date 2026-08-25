# SQL Reference for NFW MVP Database

## Critical Notes
- DO NOT assume column names - always verify with this document
- `profiles` table does NOT have `created_at` - use `joined_at` instead
- All timestamps are `TIMESTAMPTZ` unless noted

---

## `profiles` Table Schema

**Source:** `supabase/migrations/140_stripe_revenue_tracking.sql`, backup files

### Core Columns (most reliable)
| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID, PK | Primary key |
| `email` | TEXT | Synced from auth.users via trigger |
| `full_name` | TEXT | |
| `membership_level` | TEXT | 'free', 'contributing', 'founding' |
| `is_admin` | BOOLEAN | |
| `profile_completed` | BOOLEAN | |
| `city`, `state`, `zip` | TEXT | |
| `date_of_birth` | DATE | |
| `household_income` | TEXT | |
| `subscription_status` | TEXT | 'active', 'canceling', 'cancelled' |
| `subscription_ends_at` | TEXT | |

### Membership Tracking Columns
| Column | Type | Notes |
|--------|------|-------|
| `stripe_customer_id` | TEXT | Stripe customer ID - added migration 140 |
| `lifetime_value` | NUMERIC(10,2) | Total $ paid - added migration 140 |
| `signup_source` | TEXT | 'stripe', 'gift', 'unknown' - added migration 140 |
| `previous_membership_level` | TEXT | For upgrades tracking - added migration 132/140 |
| `first_paid_at` | TIMESTAMPTZ | |
| `first_paid_level` | TEXT | |
| `gift_code_redeemed` | BOOLEAN | Added migration 136 |

### FREE Membership Columns
| Column | Type | Notes |
|--------|------|-------|
| `is_approved_free_member` | BOOLEAN | For free membership approval |
| `free_membership_contact_submitted` | BOOLEAN | |
| `waitlist_joined_at` | TIMESTAMPTZ | |
| `waitlist_email_sent_at` | TIMESTAMPTZ | |
| `incomplete_email_sent_at` | TIMESTAMPTZ | |

### Other Columns
| Column | Type | Notes |
|--------|------|-------|
| `stripe_connect_account_id` | TEXT | For grant disbursements |
| `access_perks_member_id` | TEXT | |
| `access_perks_synced_at` | TIMESTAMPTZ | |
| `avatar_url` | TEXT | |
| `shipping_address` | JSONB | |
| `social_handles` | JSONB | |
| `stripe_onboarding_completed` | BOOLEAN | Added migration 114 |

### Timestamp Columns
| Column | Type | Notes |
|--------|------|-------|
| `joined_at` | TIMESTAMPTZ | When profile was created (NOT `created_at`) |
| `updated_at` | TIMESTAMPTZ | Last update |

**IMPORTANT:** `profiles` does NOT have a `created_at` column. Use `joined_at` for when the profile was created.

---

## `membership_payments` Table Schema

**Source:** `supabase/migrations/140_stripe_revenue_tracking.sql`

| Column | Type | Constraints |
|--------|------|--------------|
| `id` | UUID | PK, DEFAULT gen_random_uuid() |
| `user_id` | UUID | FK → profiles(id), NOT NULL |
| `amount` | NUMERIC(10,2) | NOT NULL |
| `payment_type` | TEXT | CHECK IN ('signup', 'renewal', 'upgrade', 'refund') |
| `stripe_payment_id` | TEXT | |
| `stripe_invoice_id` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

### Indexes
```sql
CREATE INDEX idx_membership_payments_user_id ON membership_payments(user_id);
CREATE INDEX idx_membership_payments_created_at ON membership_payments(created_at);
CREATE INDEX idx_membership_payments_payment_type ON membership_payments(payment_type);
```

---

## `membership_upgrades` Table Schema

**Source:** `supabase/migrations/140_stripe_revenue_tracking.sql`

| Column | Type | Constraints |
|--------|------|--------------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles(id), NOT NULL |
| `from_level` | TEXT | NOT NULL |
| `to_level` | TEXT | NOT NULL |
| `amount` | NUMERIC(10,2) | NOT NULL |
| `stripe_payment_id` | TEXT | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## `abandoned_checkouts` Table Schema

**Source:** `supabase/migrations/089_create_abandoned_checkouts_table.sql`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK |
| `user_id` | UUID | FK → profiles(id) |
| `membership_level` | TEXT | 'contributing' or 'founding' |
| `stripe_session_id` | TEXT | UNIQUE |
| `stripe_customer_id` | TEXT | |
| `checkout_url` | TEXT | |
| `email_sent_at` | TIMESTAMPTZ | |
| `email_retry_at` | TIMESTAMPTZ | |
| `recovered_at` | TIMESTAMPTZ | When checkout was completed |
| `expired_at` | TIMESTAMPTZ | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() |

---

## Example Queries

### Find ALL members with profiles updated but no membership_payments

```sql
SELECT
  p.id,
  p.email,
  p.membership_level,
  p.stripe_customer_id,
  p.gift_code_redeemed,
  p.signup_source,
  p.lifetime_value,
  p.first_paid_at,
  p.first_paid_level,
  p.joined_at
FROM profiles p
WHERE p.membership_level IN ('contributing', 'founding')
AND NOT EXISTS (
  SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id
)
ORDER BY p.joined_at DESC;
```

### Categorize missing payments by cause

```sql
SELECT
  CASE
    WHEN p.gift_code_redeemed = true THEN 'GIFT CODE - MISSING PAYMENT RECORD'
    WHEN b.status = 'matched' THEN 'MATCHED IN STRIPE - NEEDS PAYMENT RECORD'
    WHEN b.status = 'mismatched' THEN 'MISMATCHED IN STRIPE'
    WHEN b.status = 'not_found' THEN 'NOT FOUND IN STRIPE'
    WHEN b.status IS NULL AND p.stripe_customer_id IS NULL THEN 'NO STRIPE ID + NO BACKFILL RECORD'
    WHEN p.stripe_customer_id IS NOT NULL THEN 'HAS STRIPE ID BUT NO BACKFILL'
    ELSE 'UNKNOWN'
  END AS category,
  COUNT(*) AS count,
  SUM(CASE WHEN b.lifetime_value IS NOT NULL THEN b.lifetime_value ELSE 0 END) AS total_lifetime_value
FROM profiles p
LEFT JOIN stripe_backfill_status b ON p.id = b.profile_id
WHERE p.membership_level IN ('contributing', 'founding')
AND NOT EXISTS (
  SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id
)
GROUP BY 1
ORDER BY count DESC;
```

### Detailed breakdown: Check backfill status for the 39 non-gift members

```sql
SELECT 
  p.email,
  p.membership_level,
  p.stripe_customer_id AS profile_stripe_id,
  b.stripe_customer_id AS backfill_stripe_id,
  b.status AS backfill_status,
  b.lifetime_value AS stripe_lifetime_value,
  b.mismatch_reason
FROM profiles p
LEFT JOIN stripe_backfill_status b ON p.id = b.profile_id
WHERE p.membership_level IN ('contributing', 'founding')
AND p.gift_code_redeemed = false
AND NOT EXISTS (
  SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id
)
ORDER BY b.status NULLS LAST, p.email;
```

### Count payments by type

```sql
SELECT
  payment_type,
  COUNT(*) AS count,
  SUM(amount) AS total
FROM membership_payments
GROUP BY payment_type;
```

### Revenue reconciliation: Stripe Live vs Database

```sql
SELECT 
  'Stripe Live' AS source,
  SUM(CASE WHEN LOWER(membership_level) = 'contributing' THEN 15.00 
            WHEN LOWER(membership_level) = 'founding' THEN 100.00 
            ELSE 0 END) AS total_revenue,
  COUNT(*) AS member_count
FROM profiles
WHERE membership_level IN ('contributing', 'founding')
AND COALESCE(gift_code_redeemed, false) = false
UNION ALL
SELECT 
  'Database Payments' AS source,
  COALESCE(SUM(amount), 0) AS total_revenue,
  COUNT(DISTINCT user_id) AS member_count
FROM membership_payments
WHERE payment_type IN ('signup', 'renewal', 'upgrade');
```

### Check for duplicate payments (same stripe_payment_id)

```sql
SELECT
  stripe_payment_id,
  COUNT(*) AS count,
  SUM(amount) AS total,
  ARRAY_AGG(user_id) AS user_ids
FROM membership_payments
WHERE stripe_payment_id IS NOT NULL
GROUP BY stripe_payment_id
HAVING COUNT(*) > 1;
```

---

## Common Mistakes to Avoid

1. **DO NOT use `created_at` on profiles** - it doesn't exist. Use `joined_at`.
2. **DO NOT assume `stripe_customer_id` is populated** - it may be NULL for some members.
3. **DO NOT use `.single()` without handling the no-rows case** - use `.maybeSingle()` instead.
4. **DO NOT assume webhooks fire in order** - Stripe doesn't guarantee ordering.
5. **`checkout.session.completed` is the PRIMARY source for `membership_payments`** - It creates payment records immediately when payment succeeds. `invoice.paid` is a backup but requires `stripe_customer_id` to already be on the profile.

---

## Webhook Architecture

### Payment Record Creation Flow

```
checkout.session.completed → Creates membership_payments directly (PRIMARY)
                              ↓
invoice.paid → Creates membership_payments (BACKUP, requires stripe_customer_id)
```

**Key insight:** `checkout.session.completed` fires first and creates the payment record directly. `invoice.paid` fires later but only acts as a backup if the checkout handler didn't run.

### Why Both Exist

- `checkout.session.completed`: Fires immediately when payment succeeds. We have `userId` from metadata and `paymentIntentId` directly from the session.
- `invoice.paid`: Fires as part of Stripe's subscription processing. Required for subscription renewals and cases where checkout.session.completed didn't fire.

### The Fix (2026-08-25)

The `checkout.session.completed` handler was updated to:
1. **Always set `stripe_customer_id`** on profile (not just if NULL)
2. **Add email fallback** when userId metadata is missing
3. **Create `membership_payments` directly** in checkout.session.completed

This ensures payment records are created immediately without relying on `invoice.paid` having the correct `stripe_customer_id`.

---

## FIX SQL (Run These)

### 1. Create membership_payments for the 3 matched Stripe members

```sql
-- ljewett@thompsonk12.org - $15 contributing
INSERT INTO membership_payments (user_id, amount, payment_type, stripe_payment_id, stripe_invoice_id)
SELECT 
  p.id,
  15.00,
  'signup',
  b.stripe_payment_id,
  b.stripe_invoice_id
FROM profiles p
JOIN stripe_backfill_status b ON p.id = b.profile_id
WHERE p.email = 'ljewett@thompsonk12.org'
AND b.status = 'matched'
AND NOT EXISTS (SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id);

-- leighaweinberg@gmail.com - $100 founding  
INSERT INTO membership_payments (user_id, amount, payment_type, stripe_payment_id, stripe_invoice_id)
SELECT 
  p.id,
  100.00,
  'signup',
  b.stripe_payment_id,
  b.stripe_invoice_id
FROM profiles p
JOIN stripe_backfill_status b ON p.id = b.profile_id
WHERE p.email = 'leighaweinberg@gmail.com'
AND b.status = 'matched'
AND NOT EXISTS (SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id);

-- donnalee.souza@gmail.com - $15 contributing
INSERT INTO membership_payments (user_id, amount, payment_type, stripe_payment_id, stripe_invoice_id)
SELECT 
  p.id,
  15.00,
  'signup',
  b.stripe_payment_id,
  b.stripe_invoice_id
FROM profiles p
JOIN stripe_backfill_status b ON p.id = b.profile_id
WHERE p.email = 'donnalee.souza@gmail.com'
AND b.status = 'matched'
AND NOT EXISTS (SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id);
```

### 2. Create membership_payments for gift code redemptions (7 members)

```sql
-- Find gift code redemptions that are missing membership_payments
-- These should have amount = 15 for contributing or 100 for founding
INSERT INTO membership_payments (user_id, amount, payment_type, stripe_payment_id)
SELECT 
  p.id,
  CASE WHEN p.membership_level = 'founding' THEN 100.00 ELSE 15.00 END,
  'signup',
  'gift_code_redemption_' || p.id
FROM profiles p
WHERE p.gift_code_redeemed = true
AND p.membership_level IN ('contributing', 'founding')
AND NOT EXISTS (SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id);
```

### 3. Update stripe_customer_id for matched members (so future webhooks work)

```sql
-- Update stripe_customer_id from backfill_status for matched members
UPDATE profiles p
SET stripe_customer_id = b.stripe_customer_id,
    lifetime_value = b.lifetime_value
FROM stripe_backfill_status b
WHERE p.id = b.profile_id
AND b.status = 'matched'
AND p.stripe_customer_id IS NULL;
```

### 4. Verify the fixes worked

```sql
-- Should show 0 rows after fixes
SELECT COUNT(*) AS missing_payments_count
FROM profiles p
WHERE p.membership_level IN ('contributing', 'founding')
AND NOT EXISTS (
  SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id
);

-- Should show payments for all 3 categories
SELECT 
  CASE
    WHEN gift_code_redeemed = true THEN 'GIFT CODE'
    ELSE 'STRIPE'
  END AS source,
  COUNT(*) AS count
FROM profiles p
WHERE membership_level IN ('contributing', 'founding')
AND EXISTS (SELECT 1 FROM membership_payments mp WHERE mp.user_id = p.id)
GROUP BY 1;
```
