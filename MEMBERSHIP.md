# Membership Sign-Up Flow

## Overview

The membership sign-up flow handles user registration, email confirmation, profile completion, and membership tier selection.

## Sign-Up Flow Steps

```
/auth/sign-up → [Email/Password] → Check Email Page → Email Confirmation
                                                            ↓
                              User clicks link → /auth/sign-up?step=1
                                                            ↓
                    Step 1 (Personal Info) → Step 2 (Identity) → Step 3 (Membership)
                                                            ↓
                              Free: /auth/welcome → /dashboard
                              Paid: Stripe Checkout → /auth/welcome → /dashboard
```

### Step 0: Account Creation (`/auth/sign-up?step=0`)
- User enters email and password
- Calls `supabase.auth.signUp()` with `emailRedirectTo` pointing to `/auth/sign-up?step=1`
- Redirects to `/auth/sign-up-success?email={email}` to check email

### Step 1: Personal Info (`/auth/sign-up?step=1`)
- Full name
- Phone number
- Address (Line 1, Line 2, City, State, ZIP)
- **Auth check:** Redirects to `/auth/sign-up-success` if email not confirmed

### Step 2: Identity (`/auth/sign-up?step=2`)
- Age range (moved to top of this step)
- Household income
- Identities (multi-select)
- Social handles (optional): Instagram, Twitter, Facebook, LinkedIn
- **Auth check:** Redirects to `/auth/sign-up-success` if email not confirmed

### Step 3: Membership Selection (`/auth/sign-up?step=3`)
- Free: Redirects to `/auth/welcome` after setting `profile_completed: true`
- Contributing ($15/year): Redirects to Stripe Checkout
- Founding ($100/year): Redirects to Stripe Checkout
- **Auth check:** Redirects to `/auth/sign-up-success` if email not confirmed

### Confirmation Email (`/auth/sign-up-success`)
- Shows "Check your email" message
- Resend confirmation email button with 60-second cooldown
- Uses `supabase.auth.resend({ type: 'signup' })`

### Welcome Page (`/auth/welcome`)
- Checks if `profile_completed` is true
- If false, redirects to `/auth/sign-up?step=1`
- If true, shows welcome celebration page
- Links to `/dashboard`

## Membership Tiers

| Tier | Price | Stripe Price ID |
|------|-------|-----------------|
| Free | $0 | (no Stripe) |
| Contributing | $15/year | `price_xxx` |
| Founding | $100/year | `price_xxx` |

## Database Schema

### Profiles Table

```sql
ALTER TABLE profiles ADD COLUMN profile_completed BOOLEAN DEFAULT FALSE;
```

Fields tracked:
- `full_name`
- `age_range`
- `phone_number`
- `address_line1`
- `address_line2`
- `city`
- `state`
- `zip`
- `household_income`
- `identities` (array)
- `social_handles` (JSON: instagram, twitter, facebook, linkedin)
- `profile_completed` (boolean)
- `membership_level` (free, contributing, founding)

## API Endpoints

### Profile Update (`/api/profile/update`)
Handles updating profile fields including:
- All profile fields
- `profile_completed` boolean
- `identities` array
- `social_handles` object

### Checkout (`/api/checkout`)
Creates Stripe checkout session for paid memberships.

### Portal (`/api/portal`)
Creates Stripe Customer Portal session for managing existing subscriptions.

## Protected Routes

The following pages check for `profile_completed` and redirect to sign-up if incomplete:
- `/dashboard`
- `/perks`
- `/grants/apply`

## Supabase Configuration

### Email Confirmation
1. Go to **Authentication → Email**
2. Enable **Confirm email** toggle
3. Update email template `next` param to `/auth/sign-up?step=1`

### Email Template
```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/auth/sign-up?step=1">Confirm your email</a>
```

## Page Builder: Pricing Cards Section

The `pricing_cards` section template supports dynamic Stripe buttons.

### Section Fields
| Field | Type | Description |
|-------|------|-------------|
| `show_buttons` | boolean | Show/hide plan buttons |
| `show_cta` | boolean | Show/hide bottom CTA section |
| `stripe_price_id` | string | Stripe Price ID per plan card |

### Plan Button Logic

| User State | Free Plan | Contributing | Founding |
|-----------|-----------|---------------|----------|
| Logged out | "Join Free" → signup | "Upgrade" → signup | "Upgrade" → signup |
| Free member | "Current Plan" (disabled) | "Upgrade" → Stripe Checkout | "Upgrade" → Stripe Checkout |
| Contributing | (hidden) | "Manage Subscription" → Portal | "Upgrade" → Stripe Checkout |
| Founding | (hidden) | (hidden) | "Manage Subscription" → Portal |

### `/plans` Page Setup
1. Create page in page builder with slug `/plans`
2. Add `pricing_cards` section
3. Set `show_buttons: true`
4. Set `show_cta: false` (for upgrade page)
5. Enter `stripe_price_id` for Contributing and Founding plans

## Environment Variables

```env
STRIPE_PRICE_CONTRIBUTING=price_xxx
STRIPE_PRICE_FOUNDING=price_xxx
```

## Files

- `components/SignUpFlow.tsx` - Multi-step signup form
- `app/auth/sign-up/page.tsx` - Sign-up page wrapper
- `app/auth/sign-up-success/page.tsx` - Email confirmation page
- `app/auth/welcome/page.tsx` - Welcome page
- `components/ManageSubscription.tsx` - Dashboard subscription button
- `components/sections/PlanButton.tsx` - Pricing card button logic
- `components/sections/PricingCardsSection.tsx` - Pricing cards display
- `app/api/profile/update/route.ts` - Profile update endpoint
- `app/api/checkout/route.ts` - Stripe checkout
- `app/api/portal/route.ts` - Stripe portal
